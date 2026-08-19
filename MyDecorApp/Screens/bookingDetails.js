import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    StatusBar,
    Image,
    Platform,
    Modal,
    Alert,
    TextInput,
    Linking,
    ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { getBookingDetails } from "../database/queries/bookingDetailsQuery";
import { updateBookingReturns } from "../database/queries/updateBookingReturns";
import { updateBookingPayment } from "../database/queries/updateBookingPayment";
import { formatRWF } from "../utils/format";
import ImageViewing from "react-native-image-viewing";
import { Dropdown } from "./newBooking";
import { useClothSelector } from "./newBooking";
import { ChipGroup } from "./newBooking";
import { CLOTH_CONFIG } from "./newBooking";
import { updateBookingNotes } from "../database/queries/updateBookingNotes";
import { useImagePicker } from "./newBooking";
import { updateBookingPhotos } from "../database/queries/updateBookingPhotos";
import DateTimePicker from '@react-native-community/datetimepicker';
import { updateBookingReturnDate } from "../database/queries/updateBookingReturnDate";
import { updateBookingClothes } from "../database/queries/updateBookingClothes";
import Share from "react-native-share";
import * as FileSystem from "expo-file-system/legacy";
import { deleteBooking } from "../database/queries/deleteBookingQuery";

// ─── Design Tokens (same as NewBookingScreen) ─────────────────────────────────
const C = {
    primary: "#0F766E",
    primaryLight: "#CCFBF1",
    primaryFaded: "#F0FDFA",
    bg: "#F8FAFC",
    card: "#FFFFFF",
    text: "#0F172A",
    textSecondary: "#64748B",
    textMuted: "#94A3B8",
    border: "#E2E8F0",
    danger: "#EF4444",
    dangerFaded: "#FEF2F2",
    remaining: "#7C3AED",
    remainingFaded: "#F5F3FF",
    warning: "#D97706",
    warningFaded: "#FFFBEB",
    success: "#059669",
    successFaded: "#ECFDF5",
};

const STATUS_CONFIG = {
    active: { label: "Active", color: C.primary, bg: C.primaryFaded },
    returned: { label: "Returned", color: C.success, bg: C.successFaded },
    overdue: { label: "Overdue", color: C.danger, bg: C.dangerFaded },
};
const CLOTH_TYPES = Object.entries(CLOTH_CONFIG).map(([id, c]) => ({
    value: id,
    label: c.label,
}));
const SIZE_SCALES = {
    letter: ["XS", "S", "M", "L", "XL", "XXL"],
    number: ["28", "30", "32", "34", "36", "38","40", "42", "44", "46", "48", "50","52", "54", "56", "58", "60"],
};

const COLORS = [
    "White", "Black", "Blue","Dark Blue","violet", "Gold", "Red","Dark Red",
     "Gray", "Light Gray", "Chocolate",  "Dark Green",
    "Green", "Tan", "Pink","yellow","orange","purple","brown","beige","maroon","navy","teal","olive","silver","lime","aqua"
];
const SIZES = ["XS", "S", "M", "L", "XL", "XXL"];

const COLOR_DOT = {
    White: "#FFFFFF",
    Black: "#1E293B",
    Blue: "#3B82F6",
    Gold: "#F59E0B",
    Red: "#EF4444",
    "Dark Blue": "#1E3A8A",
    Gray: "#6B7280",
    "Light Gray":"#D1D5DB",
    Chocolate: "#7B3F00",
    "Dark Red": "#991B1B",
    "Dark Green": "#166534",
    Green: "#22C55E",
    Tan: "#D2B48C",
    Pink: "#EC4899",
    yellow: "#FACC15",
    violet: "#8B5CF6",
    orange:"#FFA500",
    purple:"#800080",
    brown:"#A52A2A",
    beige:"#F5F5DC",
    maroon:"#800000",
    navy:"#000080",
    teal:"#008080",
    olive:"#808000",
    silver:"#C0C0C0",
    lime:"#00FF00",
    aqua:"#00FFFF",
};


// ─── Reusable pieces ──────────────────────────────────────────────────────────
function SectionCard({ children, style }) {
    return <View style={[detailStyles.card, style]}>{children}</View>;
}

function SectionHeader({ icon, title, badge }) {
    return (
        <View style={detailStyles.sectionHeaderRow}>
            <Text style={detailStyles.sectionIcon}>{icon}</Text>
            <Text style={detailStyles.sectionTitle}>{title}</Text>
            {badge != null && (
                <View style={detailStyles.sectionBadge}>
                    <Text style={detailStyles.sectionBadgeText}>{badge}</Text>
                </View>
            )}
        </View>
    );
}

function InfoRow({ label, value, valueStyle }) {
    return (
        <View style={detailStyles.infoRow}>
            <Text style={detailStyles.infoLabel}>{label}</Text>
            <Text style={[detailStyles.infoValue, valueStyle]}>{value}</Text>
        </View>
    );
}

function ColorDot({ color }) {
    return (
        <View
            style={[
                detailStyles.colorDot,
                { backgroundColor: COLOR_DOT[color] ?? "#ccc" },
                color === "White" && detailStyles.colorDotWhite,
            ]}
        />
    );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function BookingDetailsScreen({ navigation, route }) {
    const { bookingId } = route.params;

    // ── Loaded booking + load state ─────────────────────────────────────────────
    const [booking, setBooking] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);
    const [viewerVisible, setViewerVisible] = useState(false);
    const [viewerImages, setViewerImages] = useState([]);
    const [imageIndex, setImageIndex] = useState(0);

    const [menuVisible, setMenuVisible] = useState(false);
    const [deleteVisible, setDeleteVisible] = useState(false);

    // ── Return tracking state ─────────────────────────────────────────────────
    // Seeded from whatever the DB actually has (via applyBookingData below) —
    // NOT reset to "nothing returned" on every load like the dummy version
    // did. That would have silently discarded real return progress every
    // time this screen re-opened.
    const [returnState, setReturnState] = useState([]);
    const [partialSheetVisible, setPartialSheetVisible] = useState(false);
    const [draftReturn, setDraftReturn] = useState([]);

    // ── Booked Items edit state ───────────────────────────────────────────────
    const [clothesEditMode, setClothesEditMode] = useState(false);
    const [clothesSaving, setClothesSaving] = useState(false);
    const clothEditor = useClothEditor();

    //returnDate update states
    // ── Return date edit state ────────────────────────────────────────────────
    const [datesEditMode, setDatesEditMode] = useState(false);
    const [draftReturnDate, setDraftReturnDate] = useState(new Date());
    const [datePickerOpen, setDatePickerOpen] = useState(false);
    const [datesError, setDatesError] = useState("");
    const [datesSaving, setDatesSaving] = useState(false);

    //payment states
    // ── Notes edit state ──────────────────────────────────────────────────────
    const [notesEditMode, setNotesEditMode] = useState(false);
    const [draftNotes, setDraftNotes] = useState("");
    const [notesError, setNotesError] = useState("");

    //photos states
    // ── Photos edit state ─────────────────────────────────────────────────────
    const [photosEditMode, setPhotosEditMode] = useState(false);
    const [draftExistingPhotos, setDraftExistingPhotos] = useState([]); // [{ id, uri, removed }]
    const [newPhotoUris, setNewPhotoUris] = useState([]);
    const [photosSaving, setPhotosSaving] = useState(false);
    const [photosError, setPhotosError] = useState("");
    const { renderImageRow, SourceModal } = useImagePicker(newPhotoUris, setNewPhotoUris);

    // ── Payment edit state ────────────────────────────────────────────────────
    const [paymentEditMode, setPaymentEditMode] = useState(false);
    const [draftTotal, setDraftTotal] = useState("0");
    const [draftPaid, setDraftPaid] = useState("0");
    const [paymentError, setPaymentError] = useState("");
    const [historyVisible, setHistoryVisible] = useState(false);

    // ── Load / reload from DB ─────────────────────────────────────────────────
    const applyBookingData = useCallback((data) => {
        setBooking(data);
        setReturnState(
            data.clothes.map((cloth) => ({
                id: cloth.id, // booking_clothes UUID — see bookingDetailsQuery.js note
                label: cloth.label,
                quantity: cloth.quantity,
                units: cloth.units.map((u) => ({ ...u })),
                returnedCount: cloth.returnedCount,
            }))
        );
    }, []);
    // ─── Cloth editor for an EXISTING booking (returned-aware) ─────────────────
    // Unlike useClothSelector (creation-only, no concept of "returned"), this
    // hook enforces: a returned unit can never be removed, quantity can never
    // drop below returnedCount, and removing a whole cloth type is blocked
    // while anything on it has returned. Color/size stay editable regardless
    // of returned status — that's an explicit product decision, not an oversight.
    function useClothEditor() {
        const [items, setItems] = useState([]);
        const [removedIds, setRemovedIds] = useState([]);
        const [error, setError] = useState("");

        const makeUnit = (config) => ({
            ...(config.hasColor && { color: "White" }),
            ...(config.hasSize && { size: SIZE_SCALES[config.sizeType][0] }),
        });

        // Called when edit mode opens — seeds from whatever getBookingDetails()
        // actually returned, not from creation defaults.
        const resetItems = useCallback((initialClothes) => {
            setItems(
                initialClothes.map((c) => ({
                    id: c.id,
                    clothId: c.clothId,
                    label: c.label,
                    quantity: c.quantity,
                    returnedCount: c.returnedCount,
                    units: c.units.map((u) => ({ ...u })),
                    isNew: false,
                }))
            );
            setRemovedIds([]);
            setError("");
        }, []);

        const toggleClothType = useCallback((clothId) => {
            setError("");
            setItems((prev) => {
                const existing = prev.find((it) => it.clothId === clothId);

                if (existing) {
                    if (existing.returnedCount > 0) {
                        setError(`Can't remove "${existing.label}" — some units already returned.`);
                        return prev;
                    }
                    if (!existing.isNew) {
                        setRemovedIds((ids) => [...ids, existing.id]);
                    }
                    return prev.filter((it) => it.clothId !== clothId);
                }

                const config = CLOTH_CONFIG[clothId];
                const needsUnits = config.hasColor || config.hasSize;
                return [
                    ...prev,
                    {
                        id: null,
                        clothId,
                        label: config.label,
                        quantity: 1,
                        returnedCount: 0,
                        units: needsUnits ? [makeUnit(config)] : [],
                        isNew: true,
                    },
                ];
            });
        }, []);

        const changeQuantity = useCallback((clothId, delta) => {
            setError("");
            setItems((prev) => prev.map((it) => {
                if (it.clothId !== clothId) return it;

                const config = CLOTH_CONFIG[it.clothId];
                const needsUnits = config.hasColor || config.hasSize;
                const floor = Math.max(1, it.returnedCount);

                if (delta < 0 && it.quantity <= floor) {
                    if (it.returnedCount > 0) {
                        setError(`Can't reduce "${it.label}" below ${floor} — some units already returned.`);
                    }
                    return it;
                }

                const newQty = it.quantity + delta;

                if (!needsUnits) {
                    return { ...it, quantity: newQty };
                }

                let units = [...it.units];
                if (delta > 0) {
                    units.push(makeUnit(config));
                } else {
                    // Remove the last NON-returned unit, wherever it sits in
                    // the array — a returned unit is never eligible.
                    const fromEnd = [...units].reverse().findIndex((u) => !u.returned);
                    if (fromEnd !== -1) {
                        units.splice(units.length - 1 - fromEnd, 1);
                    }
                }

                return { ...it, quantity: newQty, units };
            }));
        }, []);

        const updateUnit = useCallback((clothId, unitIndex, key, value) => {
            setItems((prev) => prev.map((it) => {
                if (it.clothId !== clothId) return it;
                const units = it.units.map((u, i) => (i === unitIndex ? { ...u, [key]: value } : u));
                return { ...it, units };
            }));
        }, []);

        return { items, removedIds, error, setError, resetItems, toggleClothType, changeQuantity, updateUnit };
    }

    // Reusable for both the initial/focus load AND refreshing after a
    // mutation — after any write, we refetch the canonical formatted state
    // (status, remainingAmount, payment history, etc.) rather than trying
    // to hand-patch local state and risk it drifting from what's actually
    // in the DB.
    const loadBooking = useCallback(async () => {
        try {
            const data = await getBookingDetails(bookingId);
            console.log("================================================[BookingDetailsScreen] loaded booking:", data);
            if (!data) {
                Alert.alert(
                    "Booking not found",
                    "This booking may have been deleted.",
                    [{ text: "OK", onPress: () => navigation?.goBack() }]
                );
                return;
            }
            applyBookingData(data);
            setLoadError(null);
        } catch (err) {
            console.error("[BookingDetailsScreen] failed to load booking:", err);
            setLoadError(err.message);
        }
    }, [bookingId, navigation, applyBookingData]);

    // Reload every time this screen gains focus — coming back from the edit
    // flow (once wired) should show whatever changed there.
    useFocusEffect(
        useCallback(() => {
            let cancelled = false;
            setLoading(true);
            loadBooking().finally(() => {
                if (!cancelled) setLoading(false);
            });
            return () => { cancelled = true; };
        }, [loadBooking])
    );
    //images viewer 
    const openViewer = (photos, index) => {
        if (!photos || photos.length === 0) {
            return;
        }

        setViewerImages(
            photos.map((uri) => ({
                uri,
            }))
        );

        setImageIndex(index);
        setViewerVisible(true);
    };

    // ── Call client ───────────────────────────────────────────────────────────
    const callClient = useCallback(async () => {
        if (!booking) return;
        const url = `tel:${booking.clientPhone.replace(/\s+/g, "")}`;
        try {
            await Linking.openURL(url);
        } catch (e) {
            Alert.alert("Cannot make call", "Something went wrong opening the phone app.");
        }
    }, [booking]);

    // ── Return helpers ────────────────────────────────────────────────────────
    const getReturnStatus = useCallback((item) => {
        const returned = item.units.length > 0
            ? item.units.filter((u) => u.returned).length
            : item.returnedCount;
        if (returned === 0) return "none";
        if (returned === item.quantity) return "all";
        return "partial";
    }, []);

    const allReturned = useMemo(
        () => returnState.length > 0 && returnState.every((item) => getReturnStatus(item) === "all"),
        [returnState, getReturnStatus]
    );

    // Mark every unit of every cloth as returned, persist it, then reload —
    // the reload is what actually flips the status badge to "Returned",
    // since that's computed server-side (updateBookingReturns derives
    // bookings.status from whether every cloth came back).
    const handleAllReturned = useCallback(() => {
        Alert.alert(
            "Kwemeza gutarura",
            "Wemeje ko imyenda yose yafashwe yataruwe?",
            [
                { text: "Oya", style: "cancel" },
                {
                    text: "Yego",
                    onPress: async () => {
                        const updated = returnState.map((item) => ({
                            ...item,
                            returnedCount: item.quantity,
                            units: item.units.map((u) => ({ ...u, returned: true })),
                        }));
                        try {
                            await updateBookingReturns(bookingId, updated);
                            await loadBooking();
                        } catch (err) {
                            Alert.alert("Couldn't update", err.message);
                        }
                    },
                },
            ]
        );
    }, [returnState, bookingId, loadBooking]);

    // Open partial sheet with a draft copy
    const openPartialSheet = useCallback(() => {
        setDraftReturn(
            returnState.map((item) => ({
                ...item,
                units: item.units.map((u) => ({ ...u })),
            }))
        );
        setPartialSheetVisible(true);
    }, [returnState]);

    // Toggle one unit inside the draft (for clothes WITH units)
    const toggleDraftUnit = useCallback((clothId, unitIndex) => {
        setDraftReturn((prev) =>
            prev.map((item) => {
                if (item.id !== clothId) return item;
                const units = item.units.map((u, i) =>
                    i === unitIndex ? { ...u, returned: !u.returned } : u
                );
                return { ...item, units, returnedCount: units.filter((u) => u.returned).length };
            })
        );
    }, []);

    // Toggle one anonymous unit (for clothes WITHOUT units, tracked by count)
    const toggleDraftAnonymous = useCallback((clothId, unitIndex) => {
        setDraftReturn((prev) =>
            prev.map((item) => {
                if (item.id !== clothId) return item;
                const slots = Array.from({ length: item.quantity }, (_, i) => i < item.returnedCount);
                slots[unitIndex] = !slots[unitIndex];
                const newCount = slots.filter(Boolean).length;
                return { ...item, returnedCount: newCount };
            })
        );
    }, []);


    const openClothesEdit = useCallback(() => {
        if (!booking) return;
        clothEditor.resetItems(booking.clothes);
        setClothesEditMode(true);
    }, [booking, clothEditor]);

    const cancelClothesEdit = useCallback(() => {
        setClothesEditMode(false);
        clothEditor.setError("");
    }, [clothEditor]);

    const saveClothes = useCallback(async () => {
        if (clothEditor.items.length === 0) {
            clothEditor.setError("A booking must have at least one item.");
            return;
        }
        setClothesSaving(true);
        try {
            await updateBookingClothes(bookingId, {
                updated: clothEditor.items
                    .filter((it) => !it.isNew)
                    .map((it) => ({ id: it.id, label: it.label, quantity: it.quantity, units: it.units, returnedCount: it.returnedCount })),
                added: clothEditor.items
                    .filter((it) => it.isNew)
                    .map((it) => ({ clothId: it.clothId, label: it.label, quantity: it.quantity, units: it.units })),
                removedIds: clothEditor.removedIds,
            });
            setClothesEditMode(false);
            await loadBooking();
        } catch (err) {
            clothEditor.setError(err.message);
        } finally {
            setClothesSaving(false);
        }
    }, [clothEditor, bookingId, loadBooking]);

    // Commit draft to the DB, then reload — same reasoning as handleAllReturned
    const confirmPartial = useCallback(async () => {
        try {
            await updateBookingReturns(bookingId, draftReturn);
            setPartialSheetVisible(false);
            await loadBooking();
        } catch (err) {
            Alert.alert("Couldn't update", err.message);
        }
    }, [draftReturn, bookingId, loadBooking]);
    // ----notes ---------------------------
    const openNotesEdit = useCallback(() => {
        setDraftNotes(booking?.notes || "");
        setNotesError("");
        setNotesEditMode(true);
    }, [booking]);

    const cancelNotesEdit = useCallback(() => {
        setNotesEditMode(false);
        setNotesError("");
    }, []);

    const saveNotes = useCallback(async () => {
        try {
            await updateBookingNotes(bookingId, draftNotes);
            setNotesEditMode(false);
            setNotesError("");
            await loadBooking();
        } catch (err) {
            setNotesError(err.message);
        }
    }, [draftNotes, bookingId, loadBooking]);

    //---photos --------------
    const openPhotosEdit = useCallback(() => {
        setDraftExistingPhotos(booking.photos.map((p) => ({ ...p, removed: false })));
        setNewPhotoUris([]);
        setPhotosError("");
        setPhotosEditMode(true);
    }, [booking]);

    const cancelPhotosEdit = useCallback(() => {
        setPhotosEditMode(false);
        setNewPhotoUris([]);
        setPhotosError("");
    }, []);

    const toggleRemoveExistingPhoto = useCallback((id) => {
        setDraftExistingPhotos((prev) =>
            prev.map((p) => (p.id === id ? { ...p, removed: !p.removed } : p))
        );
    }, []);

    const savePhotos = useCallback(async () => {
        const removeIds = draftExistingPhotos.filter((p) => p.removed).map((p) => p.id);
        setPhotosSaving(true);
        try {
            await updateBookingPhotos(bookingId, { addUris: newPhotoUris, removeIds });
            setPhotosEditMode(false);
            setNewPhotoUris([]);
            setPhotosError("");
            await loadBooking();
        } catch (err) {
            setPhotosError(err.message);
        } finally {
            setPhotosSaving(false);
        }
    }, [draftExistingPhotos, newPhotoUris, bookingId, loadBooking]);

    //returndate edit --------------------------------
    const openDatesEdit = useCallback(() => {
        if (!booking) return;
        setDraftReturnDate(new Date(booking.returnDate));
        setDatesError("");
        setDatesEditMode(true);
    }, [booking]);

    const cancelDatesEdit = useCallback(() => {
        setDatesEditMode(false);
        setDatePickerOpen(false);
        setDatesError("");
    }, []);

    // Date-only ISO (YYYY-MM-DD) in local time, matching the schema convention
    // — never toISOString() here, since that's UTC and can land on the wrong
    // calendar day for a Rwanda device (see handoff doc §5).
    const toLocalISODate = (date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, "0");
        const d = String(date.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
    };

    const saveDates = useCallback(async () => {
        setDatesSaving(true);
        try {
            await updateBookingReturnDate(bookingId, toLocalISODate(draftReturnDate));
            setDatesEditMode(false);
            setDatesError("");
            await loadBooking();
        } catch (err) {
            setDatesError(err.message);
        } finally {
            setDatesSaving(false);
        }
    }, [draftReturnDate, bookingId, loadBooking]);

    const formatDatePicker = (date) => {
        const d = String(date.getDate()).padStart(2, "0");
        const m = String(date.getMonth() + 1).padStart(2, "0");
        const y = date.getFullYear();
        return `${d}/${m}/${y}`;
    };

    // ── Payment ────────────────────────────────────────────────────────────────
    const openPaymentEdit = useCallback(() => {
        if (!booking) return;
        setDraftTotal(String(booking.totalAmount));
        setDraftPaid(String(booking.amountPaid));
        setPaymentError("");
        setPaymentEditMode(true);
    }, [booking]);

    const cancelPaymentEdit = useCallback(() => {
        setPaymentEditMode(false);
        setPaymentError("");
    }, []);

    // Live preview while editing — recalculated on every keystroke, same as
    // the dummy version; this is display-only until Save actually commits.
    const draftRemaining = Math.max(
        0,
        (parseInt(draftTotal) || 0) - (parseInt(draftPaid) || 0)
    );

    const savePayment = useCallback(async () => {
        const newTotal = parseInt(draftTotal) || 0;
        const newPaid = parseInt(draftPaid) || 0;

        // Client-side checks give instant feedback without a round trip.
        // updateBookingPayment() re-validates the same rules independently —
        // that's not redundant, it's the actual source of truth in case
        // anything changed between load and save.
        if (newTotal <= 0) {
            setPaymentError("Amafaranga agomba kwishyurwa agomba kuba ari hejuru ya 0.");
            return;
        }
        if (newPaid < 0) {
            setPaymentError("Amafaranga yishyuwe agomba kuba ari hejuru ya 0.");
            return;
        }
        if (newPaid > newTotal) {
            setPaymentError("Amafaranga yishyuwe ntagomba gusumba agomba kwishyurwa.");
            return;
        }

        try {
            await updateBookingPayment(bookingId, { totalAmount: newTotal, amountPaid: newPaid });
            setPaymentEditMode(false);
            setPaymentError("");
            await loadBooking(); // picks up new totals AND the new payment_history entry
        } catch (err) {
            setPaymentError(err.message);
        }
    }, [draftTotal, draftPaid, bookingId, loadBooking]);

    // ── Share ────────────────────────────────────────────────────────────────────

    const [shareSheetVisible, setShareSheetVisible] = useState(false);
    const [shareSections, setShareSections] = useState({
        client: true,
        items: true,
        dates: true,
        payment: true,
    });
    const [selectedPhotoIds, setSelectedPhotoIds] = useState([]);
    const [sharing, setSharing] = useState(false);

    const openShareSheet = useCallback(() => {
        if (!booking) return;
        setShareSections({ client: true, items: true, dates: true, payment: true });
        setSelectedPhotoIds([]);
        setShareSheetVisible(true);
    }, [booking]);

    const toggleShareSection = useCallback((key) => {
        setShareSections((prev) => ({ ...prev, [key]: !prev[key] }));
    }, []);

    const toggleSharePhoto = useCallback((id) => {
        setSelectedPhotoIds((prev) =>
            prev.includes(id) ? prev.filter((pid) => pid !== id) : [...prev, id]
        );
    }, []);

    const confirmShare = useCallback(async () => {
        if (!booking) return;

        const parts = [`MyDecor Booking - ${booking.displayCode}`];

        if (shareSections.client) {
            parts.push(`\nClient: ${booking.clientName}\nPhone:  ${booking.clientPhone}\nType:   ${booking.clientType}`);
        }
        if (shareSections.items) {
            const clothSummary = booking.clothes.map((c) => {
                const units = c.units.map((u) => [u.color, u.size].filter(Boolean).join("/")).join(", ");
                return units ? `${c.label} x${c.quantity} (${units})` : `${c.label} x${c.quantity}`;
            }).join("\n  ");
            parts.push(`\nItems:\n  ${clothSummary}`);
        }
        if (shareSections.dates) {
            parts.push(`\nBooking Date: ${booking.bookingDateFormatted}\nReturn Date:  ${booking.returnDateFormatted}`);
        }
        if (shareSections.payment) {
            parts.push(`\nTotal:     ${booking.totalAmountFormatted} RWF\nPaid:      ${booking.amountPaidFormatted} RWF\nRemaining: ${booking.remainingAmountFormatted} RWF`);
        }

        const message = parts.join("\n");

        // Selected photos live in the app's private documentDirectory
        // (booking-images/), which react-native-share's Android FileProvider
        // does NOT have whitelisted — Android blocks handing a file:// URI from
        // private storage to another app outright. Copying each selected photo
        // into cacheDirectory first puts it somewhere the provider does trust,
        // producing a URI the receiving app can actually open. These are
        // throwaway copies — nothing reads them again after the share sheet closes.
        const selectedPhotos = booking.photos.filter((p) => selectedPhotoIds.includes(p.id));
        const urls = [];
        try {
            for (const photo of selectedPhotos) {
                const extension = (photo.uri.split(".").pop() || "jpg").split("?")[0];
                const dest = `${FileSystem.cacheDirectory}share-${Date.now()}-${photo.id}.${extension}`;
                await FileSystem.copyAsync({ from: photo.uri, to: dest });
                urls.push(dest);
            }
        } catch (copyErr) {
            console.log("[BookingDetailsScreen] failed to stage photos for sharing:", copyErr);
            Alert.alert("Couldn't prepare photos", "Sharing will continue with text only.");
        }

        setSharing(true);
        try {
            console.log("[share] message:", message);
            console.log("[share] urls:", urls);
            await Share.open({
                title: "Share Booking",
                message,
                urls: urls.length > 0 ? urls : undefined,
                failOnCancel: false, // user backing out of the share sheet isn't an error
            });
            setShareSheetVisible(false);
        } catch (e) {
            // failOnCancel:false already swallows plain cancellation, so
            // anything landing here is a real failure worth knowing about.
            console.log("[BookingDetailsScreen] share failed:", e);
        } finally {
            setSharing(false);
        }
    }, [booking, shareSections, selectedPhotoIds]);




    // ── Delete ───────────────────────────────────────────────────────────────────
    const handleDelete = useCallback(() => {
        setMenuVisible(false);
        setTimeout(() => setDeleteVisible(true), 300);
    }, []);

    const confirmDelete = useCallback(async() => {
        // NOTE: this still only navigates back — it does not delete
        // anything from the DB. A real deleteBooking() mutation (soft
        // delete via the deleted_at column already in the schema) is still
        // outstanding; this rewrite only wired reads + returns + payment.
        await deleteBooking(bookingId);
        setDeleteVisible(false);
        navigation?.goBack();
    }, [navigation]);

    // ── Custom header ────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!booking) return; // default header stays until the first load finishes
        navigation?.setOptions({
            headerTitle: () => (
                <View style={headerStyles.titleContainer}>
                    <View style={headerStyles.avatar}>
                        <Text style={headerStyles.avatarText}>
                            {booking.clientName.charAt(0).toUpperCase()}
                        </Text>
                    </View>
                    <View>
                        <Text style={headerStyles.clientName} numberOfLines={1}>
                            {booking.clientName}
                        </Text>
                        <Text style={headerStyles.clientType}>{booking.clientType}</Text>
                    </View>
                </View>
            ),
            headerRight: () => (
                <View style={headerStyles.actionsRow}>
                    <TouchableOpacity
                        style={headerStyles.iconBtn}
                        onPress={openShareSheet}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="share-outline" size={21} color={C.text} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={headerStyles.iconBtn}
                        onPress={() => setMenuVisible(true)}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="ellipsis-vertical" size={21} color={C.text} />
                    </TouchableOpacity>
                </View>
            ),
            headerBackTitleVisible: false,
            headerShadowVisible: false,
            headerStyle: { backgroundColor: C.bg },
        });
    }, [booking, openShareSheet, navigation, bookingId]);

    // ── Loading / error states ──────────────────────────────────────────────────
    if (loading) {
        return (
            <View style={detailStyles.centerFill}>
                <ActivityIndicator size="large" color={C.primary} />
            </View>
        );
    }

    if (loadError) {
        return (
            <View style={detailStyles.centerFill}>
                <Text style={detailStyles.errorTitle}>Couldn't load this booking.</Text>
                <Text style={detailStyles.errorSubtitle}>{loadError}</Text>
            </View>
        );
    }

    if (!booking) return null; // navigating away after the "not found" alert

    const { daysInfo } = booking;
    const status = STATUS_CONFIG[booking.status];

    // ─────────────────────────────────────────────────────────────────────────────
    return (
        <View style={{ flex: 1, backgroundColor: C.bg }}>
            <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

            {/* share modal */}

            {/* ── Share options sheet ── */}
            <Modal
                visible={shareSheetVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setShareSheetVisible(false)}
            >
                <View style={detailStyles.sheetBackdrop}>
                    <TouchableOpacity
                        style={{ flex: 1 }}
                        activeOpacity={1}
                        onPress={() => setShareSheetVisible(false)}
                    />
                    <View style={detailStyles.returnSheet}>
                        <View style={detailStyles.sheetHandle} />
                        <View style={detailStyles.returnSheetHeader}>
                            <Text style={detailStyles.returnSheetTitle}>Share Booking</Text>
                            <TouchableOpacity
                                onPress={() => setShareSheetVisible(false)}
                                style={detailStyles.returnSheetClose}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="close" size={20} color={C.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 16, paddingBottom: 8 }}>
                            {/* ── Section toggles ── */}
                            <View style={{ gap: 10 }}>
                                <Text style={detailStyles.shareGroupLabel}>Include in text</Text>
                                {[
                                    { key: "client", label: "Client info" },
                                    { key: "items", label: "Booked items" },
                                    { key: "dates", label: "Dates" },
                                    { key: "payment", label: "Payment" },
                                ].map((s) => (
                                    <TouchableOpacity
                                        key={s.key}
                                        style={detailStyles.shareToggleRow}
                                        onPress={() => toggleShareSection(s.key)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={[detailStyles.checkbox, shareSections[s.key] && detailStyles.checkboxChecked]}>
                                            {shareSections[s.key] && <Ionicons name="checkmark" size={13} color="#fff" />}
                                        </View>
                                        <Text style={detailStyles.shareToggleText}>{s.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* ── Photo picker (multi-select) ── */}
                            {booking.photos.length > 0 && (
                                <View style={{ gap: 10 }}>
                                    <View style={detailStyles.sharePhotosHeaderRow}>
                                        <Text style={detailStyles.shareGroupLabel}>Photos</Text>
                                        {selectedPhotoIds.length > 0 && (
                                            <Text style={detailStyles.sharePhotosCount}>
                                                {selectedPhotoIds.length} selected
                                            </Text>
                                        )}
                                    </View>
                                    <ScrollView
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                        contentContainerStyle={{ gap: 10 }}
                                    >
                                        {booking.photos.map((photo) => {
                                            const selected = selectedPhotoIds.includes(photo.id);
                                            return (
                                                <TouchableOpacity
                                                    key={photo.id}
                                                    onPress={() => toggleSharePhoto(photo.id)}
                                                    activeOpacity={0.8}
                                                    style={detailStyles.photoWrapper}
                                                >
                                                    <Image
                                                        source={{ uri: photo.uri }}
                                                        style={[detailStyles.photo, selected && detailStyles.sharePhotoSelected]}
                                                        resizeMode="cover"
                                                    />
                                                    {selected && (
                                                        <View style={detailStyles.sharePhotoCheckOverlay}>
                                                            <Ionicons name="checkmark-circle" size={22} color={C.primary} />
                                                        </View>
                                                    )}
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </ScrollView>
                                </View>
                            )}
                        </ScrollView>

                        <TouchableOpacity
                            style={detailStyles.returnConfirmBtn}
                            onPress={confirmShare}
                            activeOpacity={0.85}
                            disabled={sharing}
                        >
                            {sharing ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <>
                                    <Ionicons name="share-outline" size={19} color="#fff" />
                                    <Text style={detailStyles.returnConfirmText}>Share</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* ── 3-dots dropdown menu ── */}
            <Modal
                visible={menuVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setMenuVisible(false)}
            >
                <TouchableOpacity
                    style={detailStyles.menuBackdrop}
                    activeOpacity={1}
                    onPress={() => setMenuVisible(false)}
                >
                    <View style={detailStyles.menuSheet}>


                        <TouchableOpacity
                            style={detailStyles.menuItem}
                            onPress={() => { setMenuVisible(false); openShareSheet(); }}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="share-outline" size={19} color={C.text} />
                            <Text style={detailStyles.menuItemText}>Share</Text>
                        </TouchableOpacity>

                        <View style={detailStyles.menuDivider} />

                        <TouchableOpacity
                            style={detailStyles.menuItem}
                            onPress={handleDelete}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="trash-outline" size={19} color={C.danger} />
                            <Text style={[detailStyles.menuItemText, { color: C.danger }]}>Delete Booking</Text>
                        </TouchableOpacity>

                    </View>
                </TouchableOpacity>
            </Modal>

            {/* ── Delete confirmation sheet ── */}
            <Modal
                visible={deleteVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setDeleteVisible(false)}
            >
                <TouchableOpacity
                    style={detailStyles.sheetBackdrop}
                    activeOpacity={1}
                    onPress={() => setDeleteVisible(false)}
                >
                    <TouchableOpacity
                        activeOpacity={1}
                        style={detailStyles.deleteSheet}
                        onPress={() => { }}
                    >
                        <View style={detailStyles.deleteIconWrap}>
                            <Ionicons name="trash" size={28} color={C.danger} />
                        </View>
                        <Text style={detailStyles.deleteTitle}>Delete Booking?</Text>
                        <Text style={detailStyles.deleteSubtitle}>
                            <Text>This will permanently remove </Text>
                            <Text style={{ fontWeight: "700", color: C.text }}>
                                {booking.clientName}
                            </Text>
                            <Text>'s booking. This cannot be undone.</Text>
                        </Text>
                        <TouchableOpacity
                            style={detailStyles.deleteConfirmBtn}
                            onPress={confirmDelete}
                            activeOpacity={0.8}
                        >
                            <Text style={detailStyles.deleteConfirmText}>Delete</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={detailStyles.deleteCancelBtn}
                            onPress={() => setDeleteVisible(false)}
                            activeOpacity={0.7}
                        >
                            <Text style={detailStyles.deleteCancelText}>Cancel</Text>
                        </TouchableOpacity>
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>

            {/* ── Partial return checklist sheet ── */}
            <Modal
                visible={partialSheetVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setPartialSheetVisible(false)}
            >
                <View style={detailStyles.sheetBackdrop}>
                    <TouchableOpacity
                        style={{ flex: 1 }}
                        activeOpacity={1}
                        onPress={() => setPartialSheetVisible(false)}
                    />
                    <View style={detailStyles.returnSheet}>

                        {/* Handle + header */}
                        <View style={detailStyles.sheetHandle} />
                        <View style={detailStyles.returnSheetHeader}>
                            <Text style={detailStyles.returnSheetTitle}>Emeza ibyataruwe</Text>
                            <TouchableOpacity
                                onPress={() => setPartialSheetVisible(false)}
                                style={detailStyles.returnSheetClose}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="close" size={20} color={C.textSecondary} />
                            </TouchableOpacity>
                        </View>
                        <Text style={detailStyles.returnSheetSubtitle}>
                            Suzuma neza ibyaba byataruwe ubyemeze
                        </Text>

                        {/* Checklist */}
                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{ gap: 12, paddingBottom: 8 }}
                        >
                            {draftReturn.map((item) => {
                                const hasUnits = item.units.length > 0;

                                return (
                                    <View key={item.id} style={detailStyles.checklistClothBlock}>
                                        {/* Cloth label */}
                                        <Text style={detailStyles.checklistClothLabel}>{item.label}</Text>

                                        {/* Rows */}
                                        {hasUnits
                                            ? item.units.map((unit, ui) => (
                                                <TouchableOpacity
                                                    key={ui}
                                                    style={detailStyles.checklistRow}
                                                    onPress={() => toggleDraftUnit(item.id, ui)}
                                                    activeOpacity={0.7}
                                                >
                                                    {/* Checkbox */}
                                                    <View style={[
                                                        detailStyles.checkbox,
                                                        unit.returned && detailStyles.checkboxChecked,
                                                    ]}>
                                                        {unit.returned && (
                                                            <Ionicons name="checkmark" size={13} color="#fff" />
                                                        )}
                                                    </View>

                                                    {/* Unit detail */}
                                                    <View style={detailStyles.checklistUnitInfo}>
                                                        {unit.color && <ColorDot color={unit.color} />}
                                                        <Text style={detailStyles.checklistUnitText}>
                                                            {[unit.color, unit.size].filter(Boolean).join(" · ") || `Unit ${ui + 1}`}
                                                        </Text>
                                                    </View>

                                                    {/* Returned badge */}
                                                    {unit.returned && (
                                                        <View style={detailStyles.returnedBadge}>
                                                            <Text style={detailStyles.returnedBadgeText}>Returned</Text>
                                                        </View>
                                                    )}
                                                </TouchableOpacity>
                                            ))
                                            : Array.from({ length: item.quantity }, (_, i) => {
                                                const isReturned = i < item.returnedCount;
                                                return (
                                                    <TouchableOpacity
                                                        key={i}
                                                        style={detailStyles.checklistRow}
                                                        onPress={() => toggleDraftAnonymous(item.id, i)}
                                                        activeOpacity={0.7}
                                                    >
                                                        <View style={[
                                                            detailStyles.checkbox,
                                                            isReturned && detailStyles.checkboxChecked,
                                                        ]}>
                                                            {isReturned && (
                                                                <Ionicons name="checkmark" size={13} color="#fff" />
                                                            )}
                                                        </View>
                                                        <Text style={detailStyles.checklistUnitText}>
                                                            Unit {i + 1}
                                                        </Text>
                                                        {isReturned && (
                                                            <View style={detailStyles.returnedBadge}>
                                                                <Text style={detailStyles.returnedBadgeText}>Returned</Text>
                                                            </View>
                                                        )}
                                                    </TouchableOpacity>
                                                );
                                            })
                                        }
                                    </View>
                                );
                            })}
                        </ScrollView>

                        {/* Confirm button */}
                        <TouchableOpacity
                            style={detailStyles.returnConfirmBtn}
                            onPress={confirmPartial}
                            activeOpacity={0.85}
                        >
                            <Ionicons name="checkmark-circle-outline" size={19} color="#fff" />
                            <Text style={detailStyles.returnConfirmText}>Confirm Returns</Text>
                        </TouchableOpacity>

                    </View>
                </View>
            </Modal>

            {/* ── Image viewer modal ── */}
            <ImageViewing
                images={viewerImages}
                imageIndex={imageIndex}
                visible={viewerVisible}
                onRequestClose={() =>
                    setViewerVisible(false)
                }
            />
            {/* dates picker */}
            {datePickerOpen && (
                <DateTimePicker
                    value={draftReturnDate}
                    mode="date"
                    display="default"
                    minimumDate={new Date(booking.bookingDate)}
                    onChange={(event, selectedDate) => {
                        setDatePickerOpen(false);
                        if (event.type === "dismissed" || !selectedDate) return;
                        setDraftReturnDate(selectedDate);
                        setDatesError("");
                    }}
                />
            )}

            {/* ── Scroll content ── */}
            <ScrollView
                contentContainerStyle={detailStyles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Booking code + status */}
                <View style={detailStyles.metaRow}>
                    <Text style={detailStyles.bookingId}>{booking.displayCode}</Text>
                    <View style={[detailStyles.statusBadge, { backgroundColor: status.bg }]}>
                        <Text style={[detailStyles.statusText, { color: status.color }]}>
                            {status.label}
                        </Text>
                    </View>
                </View>

                {/* ── Client ── */}
                <SectionCard>
                    <SectionHeader icon="" title="Client" />
                    <View style={detailStyles.clientBlock}>
                        <View style={detailStyles.clientAvatar}>
                            <Text style={detailStyles.clientAvatarText}>
                                {booking.clientName.charAt(0).toUpperCase()}
                            </Text>
                        </View>
                        <TouchableOpacity style={{ flex: 1, gap: 5 }} onPress={callClient}>
                            <Text style={detailStyles.clientFullName}>{booking.clientName}</Text>
                            <View style={detailStyles.clientPhoneRow}>
                                <Ionicons name="call-outline" size={14} color={C.textSecondary} />
                                <Text style={detailStyles.clientPhone}>{booking.clientPhone}</Text>
                            </View>
                            {!booking.clientAddress ? (
                                <View style={detailStyles.typePill}>
                                    <Text style={detailStyles.typePillText}>{booking.clientType}</Text>
                                </View>
                            ) : (
                                <View style={{ flexDirection: "row", alignItems: "center" }}>
                                    <View style={detailStyles.typePill}>
                                        <Text style={detailStyles.typePillText}>{booking.clientType}</Text>
                                    </View>
                                    <Text style={{ alignSelf: "center" }}>-</Text>
                                    <Text style={detailStyles.clientPhone}> {booking.clientAddress}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>
                </SectionCard>

                {/* ── Booked Items ── */}
                <SectionCard>
                    <View style={detailStyles.sectionHeaderRow}>
                        <Text style={[detailStyles.sectionTitle, { flex: 1 }]}>Bookings</Text>
                        {!clothesEditMode && (
                            <TouchableOpacity
                                style={detailStyles.paymentEditIcon}
                                onPress={openClothesEdit}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="create-outline" size={18} color={C.primary} />
                            </TouchableOpacity>
                        )}
                    </View>

                    {clothesEditMode ? (
                        <>
                            <Dropdown
                                selectedClothTypes={clothEditor.items.map((it) => ({ id: it.clothId }))}
                                onToggle={clothEditor.toggleClothType}
                            />

                            {clothEditor.items.length === 0 && (
                                <Text style={detailStyles.notesEmptyText}>No items — pick a cloth type above.</Text>
                            )}

                            {clothEditor.items.map((item) => {
                                const config = CLOTH_CONFIG[item.clothId];
                                const needsUnits = config.hasColor || config.hasSize;
                                const sizeOptions = config.hasSize ? SIZE_SCALES[config.sizeType] : [];
                                const floor = Math.max(1, item.returnedCount);

                                return (
                                    <View key={item.clothId} style={detailStyles.clothEditCard}>
                                        <View style={detailStyles.clothEditHeaderRow}>
                                            <Text style={detailStyles.clothLabel}>{item.label}</Text>
                                            <TouchableOpacity
                                                onPress={() => clothEditor.toggleClothType(item.clothId)}
                                                style={detailStyles.clothRemoveBtn}
                                                activeOpacity={0.7}
                                            >
                                                <Ionicons name="trash-outline" size={16} color={C.danger} />
                                            </TouchableOpacity>
                                        </View>

                                        {item.returnedCount > 0 && (
                                            <Text style={detailStyles.clothReturnedNote}>
                                                {item.returnedCount} of {item.quantity} already returned — can't remove or go below {floor}.
                                            </Text>
                                        )}

                                        <View style={detailStyles.clothQtyRow}>
                                            <Text style={detailStyles.inputLabel}>Quantity</Text>
                                            <View style={detailStyles.quantityRow}>
                                                <TouchableOpacity
                                                    style={[detailStyles.qtyBtn, item.quantity <= floor && detailStyles.qtyBtnDisabled]}
                                                    onPress={() => clothEditor.changeQuantity(item.clothId, -1)}
                                                    activeOpacity={0.7}
                                                >
                                                    <Text style={detailStyles.qtyBtnText}>−</Text>
                                                </TouchableOpacity>
                                                <Text style={detailStyles.qtyValue}>{item.quantity}</Text>
                                                <TouchableOpacity
                                                    style={detailStyles.qtyBtn}
                                                    onPress={() => clothEditor.changeQuantity(item.clothId, +1)}
                                                    activeOpacity={0.7}
                                                >
                                                    <Text style={detailStyles.qtyBtnText}>+</Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>

                                        {needsUnits && item.units.map((unit, ui) => (
                                            <View key={ui} style={detailStyles.clothUnitBlock}>
                                                <View style={detailStyles.clothUnitHeaderRow}>
                                                    <Text style={detailStyles.clothUnitLabel}>
                                                        {item.quantity > 1 ? `Unit ${ui + 1}` : "Details"}
                                                    </Text>
                                                    {unit.returned && (
                                                        <View style={detailStyles.returnedBadge}>
                                                            <Text style={detailStyles.returnedBadgeText}>Returned</Text>
                                                        </View>
                                                    )}
                                                </View>

                                                {config.hasColor && (
                                                    <ChipGroup
                                                        options={COLORS}
                                                        selected={unit.color}
                                                        onSelect={(v) => clothEditor.updateUnit(item.clothId, ui, "color", v)}
                                                        colorMode
                                                    />
                                                )}
                                                {config.hasSize && (
                                                    <ChipGroup
                                                        options={sizeOptions}
                                                        selected={unit.size}
                                                        onSelect={(v) => clothEditor.updateUnit(item.clothId, ui, "size", v)}
                                                    />
                                                )}
                                            </View>
                                        ))}
                                    </View>
                                );
                            })}

                            {clothEditor.error !== "" && (
                                <View style={detailStyles.paymentErrorRow}>
                                    <Ionicons name="alert-circle-outline" size={15} color={C.danger} />
                                    <Text style={detailStyles.paymentErrorText}>{clothEditor.error}</Text>
                                </View>
                            )}

                            <View style={detailStyles.paymentEditActions}>
                                <TouchableOpacity style={detailStyles.paymentCancelBtn} onPress={cancelClothesEdit} activeOpacity={0.7} disabled={clothesSaving}>
                                    <Text style={detailStyles.paymentCancelText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={detailStyles.paymentSaveBtn} onPress={saveClothes} activeOpacity={0.8} disabled={clothesSaving}>
                                    {clothesSaving ? (
                                        <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                        <>
                                            <Ionicons name="checkmark" size={16} color="#fff" />
                                            <Text style={detailStyles.paymentSaveText}>Save</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </>
                    ) : (
                        // ── existing read-mode block, unchanged ──
                        returnState.map((item, ci) => {
                            const rStatus = getReturnStatus(item);
                            const returnIcon =
                                rStatus === "all" ? { name: "checkmark-circle", color: C.success } :
                                    rStatus === "partial" ? { name: "time", color: C.warning } :
                                        { name: "time-outline", color: C.textMuted };
                            return (
                                <View key={item.id} style={[detailStyles.clothRow, ci < returnState.length - 1 && detailStyles.clothRowBorder]}>
                                    <View style={detailStyles.clothTopRow}>
                                        <Text style={detailStyles.clothLabel}>{item.label}</Text>
                                        <View style={detailStyles.clothTopRight}>
                                            <Ionicons name={returnIcon.name} size={18} color={returnIcon.color} />
                                            <View style={detailStyles.qtyBadge}>
                                                <Text style={detailStyles.qtyBadgeText}>x{item.quantity}</Text>
                                            </View>
                                        </View>
                                    </View>
                                    {item.units.length > 0 && (
                                        <View style={detailStyles.unitsWrap}>
                                            {item.units.map((unit, ui) => (
                                                <View key={ui} style={[detailStyles.unitChip, unit.returned && detailStyles.unitChipReturned]}>
                                                    {unit.color && <ColorDot color={unit.color} />}
                                                    <Text style={[detailStyles.unitChipText, unit.returned && { color: C.success }]}>
                                                        {[unit.color, unit.size].filter(Boolean).join(" · ")}
                                                    </Text>
                                                    {unit.returned && <Ionicons name="checkmark-circle" size={13} color={C.success} />}
                                                </View>
                                            ))}
                                        </View>
                                    )}
                                    {item.units.length === 0 && item.returnedCount > 0 && (
                                        <Text style={detailStyles.returnedCountText}>{item.returnedCount} of {item.quantity} returned</Text>
                                    )}
                                </View>
                            );
                        })
                    )}
                </SectionCard>
                {/* ── Notes ── */}
                <SectionCard>
                    <View style={detailStyles.sectionHeaderRow}>
                        <Text style={[detailStyles.sectionTitle, { flex: 1 }]}>Notes</Text>
                        {!notesEditMode && (
                            <TouchableOpacity
                                style={detailStyles.paymentEditIcon}
                                onPress={openNotesEdit}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="create-outline" size={18} color={C.primary} />
                            </TouchableOpacity>
                        )}
                    </View>

                    {notesEditMode ? (
                        <>
                            <TextInput
                                style={[detailStyles.paymentInput, { minHeight: 90, textAlignVertical: "top", fontWeight: "400", fontSize: 14 }]}
                                value={draftNotes}
                                onChangeText={(v) => { setDraftNotes(v); setNotesError(""); }}
                                placeholder="Add a note..."
                                placeholderTextColor={C.textMuted}
                                multiline
                                cursorColor={C.primary}
                            />

                            {notesError !== "" && (
                                <View style={detailStyles.paymentErrorRow}>
                                    <Ionicons name="alert-circle-outline" size={15} color={C.danger} />
                                    <Text style={detailStyles.paymentErrorText}>{notesError}</Text>
                                </View>
                            )}

                            <View style={detailStyles.paymentEditActions}>
                                <TouchableOpacity
                                    style={detailStyles.paymentCancelBtn}
                                    onPress={cancelNotesEdit}
                                    activeOpacity={0.7}
                                >
                                    <Text style={detailStyles.paymentCancelText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={detailStyles.paymentSaveBtn}
                                    onPress={saveNotes}
                                    activeOpacity={0.8}
                                >
                                    <Ionicons name="checkmark" size={16} color="#fff" />
                                    <Text style={detailStyles.paymentSaveText}>Save</Text>
                                </TouchableOpacity>
                            </View>
                        </>
                    ) : booking.notes ? (
                        <Text style={detailStyles.notesText}>{booking.notes}</Text>
                    ) : (
                        <TouchableOpacity onPress={openNotesEdit} activeOpacity={0.6}>
                            <Text style={detailStyles.notesEmptyText}>No notes yet — tap to add one.</Text>
                        </TouchableOpacity>
                    )}
                </SectionCard>

                {/* ── Photos ── */}
                <SectionCard>
                    <View style={detailStyles.sectionHeaderRow}>
                        <Text style={[detailStyles.sectionTitle, { flex: 1 }]}>Photos</Text>
                        {!photosEditMode && (
                            <TouchableOpacity
                                style={detailStyles.paymentEditIcon}
                                onPress={openPhotosEdit}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="create-outline" size={18} color={C.primary} />
                            </TouchableOpacity>
                        )}
                    </View>

                    {photosEditMode ? (
                        <>
                            <SourceModal />

                            {draftExistingPhotos.length > 0 && (
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={detailStyles.photoScroll}
                                >
                                    {draftExistingPhotos.map((photo) => (
                                        <View key={photo.id} style={detailStyles.photoWrapper}>
                                            <Image
                                                source={{ uri: photo.uri }}
                                                style={[detailStyles.photo, photo.removed && detailStyles.photoRemoved]}
                                                resizeMode="cover"
                                            />
                                            <TouchableOpacity
                                                style={[detailStyles.photoRemoveBtn, photo.removed && detailStyles.photoRemoveBtnActive]}
                                                onPress={() => toggleRemoveExistingPhoto(photo.id)}
                                                activeOpacity={0.8}
                                            >
                                                <Ionicons name={photo.removed ? "refresh" : "close"} size={13} color="#fff" />
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                </ScrollView>
                            )}

                            {renderImageRow()}

                            {photosError !== "" && (
                                <View style={detailStyles.paymentErrorRow}>
                                    <Ionicons name="alert-circle-outline" size={15} color={C.danger} />
                                    <Text style={detailStyles.paymentErrorText}>{photosError}</Text>
                                </View>
                            )}

                            <View style={detailStyles.paymentEditActions}>
                                <TouchableOpacity
                                    style={detailStyles.paymentCancelBtn}
                                    onPress={cancelPhotosEdit}
                                    activeOpacity={0.7}
                                    disabled={photosSaving}
                                >
                                    <Text style={detailStyles.paymentCancelText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={detailStyles.paymentSaveBtn}
                                    onPress={savePhotos}
                                    activeOpacity={0.8}
                                    disabled={photosSaving}
                                >
                                    {photosSaving ? (
                                        <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                        <>
                                            <Ionicons name="checkmark" size={16} color="#fff" />
                                            <Text style={detailStyles.paymentSaveText}>Save</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </>
                    ) : booking.photos.length > 0 ? (
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={detailStyles.photoScroll}
                        >
                            {booking.photos.map((photo, i) => (
                                <TouchableOpacity
                                    key={photo.id}
                                    activeOpacity={0.85}
                                    style={detailStyles.photoWrapper}
                                    onPress={() => openViewer(booking.photos.map((p) => p.uri), i)}
                                >
                                    <Image source={{ uri: photo.uri }} style={detailStyles.photo} resizeMode="cover" />
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    ) : (
                        <TouchableOpacity onPress={openPhotosEdit} activeOpacity={0.6}>
                            <Text style={detailStyles.notesEmptyText}>No photos yet — tap to add some.</Text>
                        </TouchableOpacity>
                    )}
                </SectionCard>

                {/* ── Dates ── */}
                <SectionCard>
                    <View style={detailStyles.sectionHeaderRow}>
                        <Text style={[detailStyles.sectionTitle, { flex: 1 }]}>Dates</Text>
                        {!datesEditMode && (
                            <TouchableOpacity
                                style={detailStyles.paymentEditIcon}
                                onPress={openDatesEdit}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="create-outline" size={18} color={C.primary} />
                            </TouchableOpacity>
                        )}
                    </View>

                    {datesEditMode ? (
                        <>
                            <View style={detailStyles.datesGrid}>
                                <View style={detailStyles.dateBlock}>
                                    <Text style={detailStyles.dateBlockLabel}>Booking Date</Text>
                                    <Text style={detailStyles.dateBlockValue}>{booking.bookingDateFormatted}</Text>
                                </View>
                                <View style={detailStyles.dateArrowWrap}>
                                    <Ionicons name="arrow-forward" size={16} color={C.textMuted} />
                                </View>
                                <View style={{ flex: 1, gap: 4 }}>
                                    <Text style={detailStyles.dateBlockLabel}>Return Date</Text>
                                    <TouchableOpacity
                                        style={detailStyles.dateEditBtn}
                                        onPress={() => setDatePickerOpen(true)}
                                        activeOpacity={0.75}
                                    >
                                        <Ionicons name="calendar" size={16} color={C.primary} />
                                        <Text style={detailStyles.dateEditBtnText}>{formatDatePicker(draftReturnDate)}</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {datesError !== "" && (
                                <View style={detailStyles.paymentErrorRow}>
                                    <Ionicons name="alert-circle-outline" size={15} color={C.danger} />
                                    <Text style={detailStyles.paymentErrorText}>{datesError}</Text>
                                </View>
                            )}

                            <View style={detailStyles.paymentEditActions}>
                                <TouchableOpacity
                                    style={detailStyles.paymentCancelBtn}
                                    onPress={cancelDatesEdit}
                                    activeOpacity={0.7}
                                    disabled={datesSaving}
                                >
                                    <Text style={detailStyles.paymentCancelText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={detailStyles.paymentSaveBtn}
                                    onPress={saveDates}
                                    activeOpacity={0.8}
                                    disabled={datesSaving}
                                >
                                    {datesSaving ? (
                                        <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                        <>
                                            <Ionicons name="checkmark" size={16} color="#fff" />
                                            <Text style={detailStyles.paymentSaveText}>Save</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </>
                    ) : (
                        <>
                            <View style={detailStyles.datesGrid}>
                                <View style={detailStyles.dateBlock}>
                                    <Text style={detailStyles.dateBlockLabel}>Booking Date</Text>
                                    <Text style={detailStyles.dateBlockValue}>{booking.bookingDateFormatted}</Text>
                                </View>
                                <View style={detailStyles.dateArrowWrap}>
                                    <Ionicons name="arrow-forward" size={16} color={C.textMuted} />
                                </View>
                                <View style={[detailStyles.dateBlock, { alignItems: "flex-end" }]}>
                                    <Text style={detailStyles.dateBlockLabel}>Return Date</Text>
                                    <Text style={detailStyles.dateBlockValue}>{booking.returnDateFormatted}</Text>
                                </View>
                            </View>

                            {/* Days remaining pill */}
                            {!allReturned && (
                                <View
                                    style={[
                                        detailStyles.daysPill,
                                        daysInfo.type === "ok" && { backgroundColor: C.primaryFaded, borderColor: C.primaryLight },
                                        daysInfo.type === "warning" && { backgroundColor: C.warningFaded, borderColor: "#FDE68A" },
                                        daysInfo.type === "overdue" && { backgroundColor: C.dangerFaded, borderColor: "#FECACA" },
                                    ]}
                                >
                                    <Ionicons
                                        name={
                                            daysInfo.type === "ok" ? "time-outline" :
                                                daysInfo.type === "warning" ? "alert-circle-outline" :
                                                    "warning-outline"
                                        }
                                        size={15}
                                        color={
                                            daysInfo.type === "ok" ? C.primary :
                                                daysInfo.type === "warning" ? C.warning :
                                                    C.danger
                                        }
                                    />
                                    <Text
                                        style={[
                                            detailStyles.daysPillText,
                                            daysInfo.type === "ok" && { color: C.primary },
                                            daysInfo.type === "warning" && { color: C.warning },
                                            daysInfo.type === "overdue" && { color: C.danger },
                                        ]}
                                    >
                                        {daysInfo.label}
                                    </Text>
                                </View>
                            )}

                            {/* Return confirmation row */}
                            {allReturned ? (
                                <View style={detailStyles.allReturnedBanner}>
                                    <Ionicons name="checkmark-circle" size={20} color={C.success} />
                                    <Text style={detailStyles.allReturnedText}>Imyenda yose yarataruwe</Text>
                                </View>
                            ) : (
                                <View style={detailStyles.returnBtnsRow}>
                                    <TouchableOpacity style={detailStyles.allReturnBtn} onPress={handleAllReturned} activeOpacity={0.8}>
                                        <Ionicons name="checkmark-done-outline" size={16} color={C.primary} />
                                        <Text style={detailStyles.allReturnBtnText}>Yose yataruwe</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={detailStyles.someReturnBtn} onPress={openPartialSheet} activeOpacity={0.8}>
                                        <Ionicons name="list-outline" size={16} color={C.textSecondary} />
                                        <Text style={detailStyles.someReturnBtnText}>Imyenda yataruwe</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </>
                    )}
                </SectionCard>

                {/* ── Payment ── */}
                <SectionCard>

                    {/* Header row with edit pencil */}
                    <View style={detailStyles.sectionHeaderRow}>

                        <Text style={[detailStyles.sectionTitle, { flex: 1 }]}>Payment</Text>
                        {!paymentEditMode && !booking.fullyPaid && (
                            <TouchableOpacity
                                style={detailStyles.paymentEditIcon}
                                onPress={openPaymentEdit}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="create-outline" size={18} color={C.primary} />
                            </TouchableOpacity>
                        )}
                    </View>

                    {paymentEditMode ? (
                        /* ── Edit mode ── */
                        <>
                            {/* Total Amount input */}
                            <View style={detailStyles.paymentInputWrapper}>
                                <Text style={detailStyles.paymentInputLabel}>Agomba kwishyurwa (RWF)</Text>
                                <TextInput
                                    style={detailStyles.paymentInput}
                                    value={draftTotal}
                                    onChangeText={(v) => { setDraftTotal(v); setPaymentError(""); }}
                                    keyboardType="numeric"
                                    placeholderTextColor={C.textMuted}
                                    placeholder="0"
                                    cursorColor={C.primary}
                                />
                            </View>

                            {/* Amount Paid input */}
                            <View style={detailStyles.paymentInputWrapper}>
                                <Text style={detailStyles.paymentInputLabel}>Ayishyuwe yose hamwe kugeza ubu (RWF)</Text>
                                <TextInput
                                    style={detailStyles.paymentInput}
                                    value={draftPaid}
                                    onChangeText={(v) => { setDraftPaid(v); setPaymentError(""); }}
                                    keyboardType="numeric"
                                    placeholderTextColor={C.textMuted}
                                    placeholder="0"
                                    cursorColor={C.primary}
                                />
                            </View>

                            {/* Live remaining preview */}
                            <View style={detailStyles.remainingBlock}>
                                <View>
                                    <Text style={detailStyles.remainingLabel}>Asigaye kwishyurwa</Text>
                                    <Text style={detailStyles.remainingNote}>Auto-calculated</Text>
                                </View>
                                <Text style={detailStyles.remainingAmount}>
                                    {formatRWF(draftRemaining)} RWF
                                </Text>
                            </View>

                            {/* Inline validation error */}
                            {paymentError !== "" && (
                                <View style={detailStyles.paymentErrorRow}>
                                    <Ionicons name="alert-circle-outline" size={15} color={C.danger} />
                                    <Text style={detailStyles.paymentErrorText}>{paymentError}</Text>
                                </View>
                            )}

                            {/* Cancel / Save */}
                            <View style={detailStyles.paymentEditActions}>
                                <TouchableOpacity
                                    style={detailStyles.paymentCancelBtn}
                                    onPress={cancelPaymentEdit}
                                    activeOpacity={0.7}
                                >
                                    <Text style={detailStyles.paymentCancelText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={detailStyles.paymentSaveBtn}
                                    onPress={savePayment}
                                    activeOpacity={0.8}
                                >
                                    <Ionicons name="checkmark" size={16} color="#fff" />
                                    <Text style={detailStyles.paymentSaveText}>Save</Text>
                                </TouchableOpacity>
                            </View>
                        </>
                    ) : (
                        /* ── Read mode ── */
                        <>
                            <InfoRow
                                label="Agomba Kwishyurwa"
                                value={`${booking.totalAmountFormatted} RWF`}
                                valueStyle={detailStyles.paymentTotal}
                            />
                            <View style={detailStyles.paymentDivider} />
                            <InfoRow
                                label="Ayishyuwe"
                                value={`${booking.amountPaidFormatted} RWF`}
                                valueStyle={{ color: C.success, fontWeight: "600" }}
                            />

                            {/* Remaining or fully paid banner */}
                            {booking.fullyPaid ? (
                                <View style={detailStyles.fullyPaidBanner}>
                                    <Ionicons name="checkmark-circle" size={20} color={C.success} />
                                    <Text style={detailStyles.fullyPaidText}>Yose yishyuwe</Text>
                                </View>
                            ) : (
                                <View style={detailStyles.remainingBlock}>
                                    <View>
                                        <Text style={detailStyles.remainingLabel}>Asigaye kwishyurwa</Text>
                                        <Text style={detailStyles.remainingNote}>Auto-calculated</Text>
                                    </View>
                                    <Text style={detailStyles.remainingAmount}>
                                        {booking.remainingAmountFormatted} RWF
                                    </Text>
                                </View>
                            )}
                        </>
                    )}

                    {/* ── Payment history log ── */}
                    {booking.paymentHistory.length > 0 && !paymentEditMode && (
                        <>
                            <TouchableOpacity
                                style={detailStyles.historyToggleRow}
                                onPress={() => setHistoryVisible((v) => !v)}
                                activeOpacity={0.7}
                            >
                                <Ionicons
                                    name={historyVisible ? "chevron-up" : "chevron-down"}
                                    size={15}
                                    color={C.textSecondary}
                                />
                                <Text style={detailStyles.historyToggleText}>
                                    Payment history · {booking.paymentHistory.length} {booking.paymentHistory.length === 1 ? "entry" : "entries"}
                                </Text>
                            </TouchableOpacity>

                            {historyVisible && (
                                <View style={detailStyles.historyList}>
                                    {booking.paymentHistory.map((entry, i) => {
                                        // amount can be negative now (payment corrections) —
                                        // sign/color is a presentation choice made HERE,
                                        // the query only ever returns a magnitude string.
                                        const isNegative = entry.amount < 0;
                                        return (
                                            <View
                                                key={entry.id}
                                                style={[
                                                    detailStyles.historyRow,
                                                    i < booking.paymentHistory.length - 1 && detailStyles.historyRowBorder,
                                                ]}
                                            >
                                                <View
                                                    style={[
                                                        detailStyles.historyDot,
                                                        isNegative && { backgroundColor: C.danger },
                                                    ]}
                                                />
                                                <View style={{ flex: 1, gap: 2 }}>
                                                    <Text style={detailStyles.historyNote}>{entry.note}</Text>
                                                    <Text style={detailStyles.historyDate}>{entry.dateFormatted}</Text>
                                                </View>
                                                <Text
                                                    style={[
                                                        detailStyles.historyAmount,
                                                        isNegative && { color: C.danger },
                                                    ]}
                                                >
                                                    {isNegative ? "-" : "+"}{entry.amountFormatted} RWF
                                                </Text>
                                            </View>
                                        );
                                    })}
                                </View>
                            )}
                        </>
                    )}

                </SectionCard>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

// ─── Header Styles ────────────────────────────────────────────────────────────
const headerStyles = StyleSheet.create({
    titleContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        maxWidth: 200,
    },
    shareGroupLabel: {
        fontSize: 13,
        fontWeight: "700",
        color: C.textMuted,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    sharePhotosHeaderRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    sharePhotosCount: {
        fontSize: 12,
        fontWeight: "700",
        color: C.primary,
    },
    shareToggleRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        backgroundColor: C.bg,
    },
    shareToggleText: {
        fontSize: 14,
        fontWeight: "500",
        color: C.text,
    },
    sharePhotoSelected: {
        opacity: 0.55,
    },
    sharePhotoCheckOverlay: {
        position: "absolute",
        top: 6,
        right: 6,
        backgroundColor: "#fff",
        borderRadius: 11,
    },
    avatar: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: C.primaryLight,
        alignItems: "center",
        justifyContent: "center",
    },
    avatarText: {
        fontSize: 16,
        fontWeight: "700",
        color: C.primary,
    },
    clientName: {
        fontSize: 15,
        fontWeight: "700",
        color: C.text,
        letterSpacing: -0.2,
    },
    clientType: {
        fontSize: 12,
        color: C.textSecondary,
        marginTop: 1,
    },
    actionsRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 2,
        paddingRight: 8,
    },
    iconBtn: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
    },
});

// ─── Screen Styles ────────────────────────────────────────────────────────────
const detailStyles = StyleSheet.create({

    centerFill: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: C.bg,
        padding: 24,
    },
    errorTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: C.text,
        marginBottom: 6,
        textAlign: "center",
    },
    errorSubtitle: {
        fontSize: 13,
        color: C.textSecondary,
        textAlign: "center",
    },

    scrollContent: { padding: 16, gap: 16 },

    // Meta row
    metaRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 2,
    },
    bookingId: {
        fontSize: 13,
        fontWeight: "700",
        color: C.textMuted,
        letterSpacing: 0.5,
        textTransform: "uppercase",
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 99,
    },
    statusText: {
        fontSize: 12,
        fontWeight: "700",
        letterSpacing: 0.3,
    },

    // Card
    card: {
        backgroundColor: C.card,
        borderRadius: 18,
        padding: 18,
        gap: 14,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.055,
        shadowRadius: 10,
        elevation: 3,
    },

    // Section header
    sectionHeaderRow: {
        flexDirection: "row",
        alignItems: "center",

    },
    sectionIcon: { fontSize: 17 },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: C.text,
        letterSpacing: -0.2,
        flex: 1,
    },
    sectionBadge: {
        backgroundColor: C.primaryLight,
        borderRadius: 99,
        paddingHorizontal: 9,
        paddingVertical: 3,
    },
    sectionBadgeText: {
        fontSize: 12,
        fontWeight: "700",
        color: C.primary,
    },

    // Client
    clientBlock: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 14,
    },
    clientAvatar: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: C.primaryLight,
        alignItems: "center",
        justifyContent: "center",
    },
    clientAvatarText: {
        fontSize: 22,
        fontWeight: "700",
        color: C.primary,
    },
    clientFullName: {
        fontSize: 16,
        fontWeight: "700",
        color: C.text,
        letterSpacing: -0.2,
    },
    clientPhoneRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
    },
    clientPhone: {
        fontSize: 13,
        color: C.textSecondary,
    },
    typePill: {
        alignSelf: "flex-start",
        backgroundColor: C.primaryFaded,
        borderRadius: 99,
        paddingHorizontal: 10,
        paddingVertical: 3,
    },
    typePillText: {
        fontSize: 11,
        fontWeight: "700",
        color: C.primary,
        letterSpacing: 0.3,
    },

    // Clothes
    clothRow: {
        gap: 8,
        paddingVertical: 10,
    },
    clothEditCard: {
        backgroundColor: C.bg,
        borderRadius: 14,
        padding: 14,
        gap: 10,
        borderWidth: 1,
        borderColor: C.border,
    },
    clothEditHeaderRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    clothRemoveBtn: {
        width: 30,
        height: 30,
        borderRadius: 8,
        backgroundColor: C.dangerFaded,
        alignItems: "center",
        justifyContent: "center",
    },
    clothReturnedNote: {
        fontSize: 12,
        color: C.warning,
        fontStyle: "italic",
    },
    clothQtyRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    quantityRow: {
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1.5,
        borderColor: C.border,
        borderRadius: 12,
        overflow: "hidden",
    },
    qtyBtn: {
        width: 38,
        height: 38,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: C.card,
    },
    qtyBtnDisabled: {
        opacity: 0.35,
    },
    qtyBtnText: {
        fontSize: 18,
        color: C.primary,
        fontWeight: "600",
    },
    qtyValue: {
        width: 38,
        textAlign: "center",
        fontSize: 15,
        fontWeight: "700",
        color: C.text,
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderColor: C.border,
    },
    clothUnitBlock: {
        gap: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: C.border,
    },
    clothUnitHeaderRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    clothUnitLabel: {
        fontSize: 13,
        fontWeight: "600",
        color: C.textSecondary,
    },
    clothRowBorder: {
        borderBottomWidth: 1,
        borderBottomColor: C.border,
    },
    clothTopRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    clothLabel: {
        fontSize: 15,
        fontWeight: "600",
        color: C.text,
    },
    qtyBadge: {
        backgroundColor: C.bg,
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderWidth: 1,
        borderColor: C.border,
    },
    qtyBadgeText: {
        fontSize: 13,
        fontWeight: "700",
        color: C.textSecondary,
    },
    unitsWrap: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 7,
    },
    unitChip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: C.bg,
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderWidth: 1,
        borderColor: C.border,
    },
    unitChipText: {
        fontSize: 12,
        fontWeight: "600",
        color: C.textSecondary,
    },
    colorDot: {
        width: 11,
        height: 11,
        borderRadius: 6,
    },
    colorDotWhite: {
        borderWidth: 1,
        borderColor: C.border,
    },

    // Photos
    photoScroll: { gap: 10, paddingVertical: 2 },
    photoWrapper: { borderRadius: 12, overflow: "hidden" },
    photo: {
        width: 100,
        height: 100,
        borderRadius: 12,
    },
    photoRemoved: {
        opacity: 0.35,
    },
    photoRemoveBtn: {
        position: "absolute",
        top: 5,
        right: 5,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: "rgba(0,0,0,0.55)",
        alignItems: "center",
        justifyContent: "center",
    },
    photoRemoveBtnActive: {
        backgroundColor: C.danger,
    },

    // Dates
    datesGrid: {
        flexDirection: "row",
        alignItems: "center",
    },
    dateBlock: { flex: 1, gap: 4 },
    dateBlockLabel: {
        fontSize: 12,
        fontWeight: "600",
        color: C.textMuted,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    dateBlockValue: {
        fontSize: 17,
        fontWeight: "700",
        color: C.text,
        letterSpacing: -0.3,
    },
    dateArrowWrap: {
        paddingHorizontal: 12,
        paddingTop: 12,
    },
    daysPill: {
        flexDirection: "row",
        alignItems: "center",
        gap: 7,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
    },
    daysPillText: {
        fontSize: 13,
        fontWeight: "600",
    },

    // Payment
    infoRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    infoLabel: {
        fontSize: 14,
        color: C.textSecondary,
    },
    infoValue: {
        fontSize: 15,
        fontWeight: "600",
        color: C.text,
    },
    notesText: {
        fontSize: 14,
        color: C.text,
        lineHeight: 20,
    },
    paymentTotal: {
        fontSize: 16,
        fontWeight: "700",
        color: C.text,
    },
    paymentDivider: {
        height: 1,
        backgroundColor: C.border,
    },
    remainingBlock: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: C.remainingFaded,
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: "#DDD6FE",
        marginTop: 2,
    },
    remainingLabel: {
        fontSize: 14,
        fontWeight: "600",
        color: C.remaining,
    },
    remainingNote: {
        fontSize: 11,
        color: "#A78BFA",
        marginTop: 2,
    },
    remainingAmount: {
        fontSize: 18,
        fontWeight: "800",
        color: C.remaining,
        letterSpacing: -0.5,
    },

    // Action buttons
    actionsSection: { gap: 12, marginTop: 4 },
    editBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        backgroundColor: C.primary,
        borderRadius: 16,
        paddingVertical: 17,
        shadowColor: C.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 14,
        elevation: 6,
    },
    editBtnText: {
        fontSize: 16,
        fontWeight: "700",
        color: "#fff",
    },
    secondaryRow: {
        flexDirection: "row",
        gap: 12,
    },
    shareBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        paddingVertical: 14,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: C.primary,
        backgroundColor: C.primaryFaded,
    },
    shareBtnText: {
        fontSize: 15,
        fontWeight: "600",
        color: C.primary,
    },
    deleteBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        paddingVertical: 14,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: C.danger,
        backgroundColor: C.dangerFaded,
    },
    deleteBtnText: {
        fontSize: 15,
        fontWeight: "600",
        color: C.danger,
    },

    // 3-dots menu
    menuBackdrop: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.2)",
    },
    menuSheet: {
        position: "absolute",
        top: Platform.OS === "ios" ? 100 : 60,
        right: 16,
        backgroundColor: C.card,
        borderRadius: 14,
        paddingVertical: 6,
        minWidth: 190,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 20,
        elevation: 10,
    },
    menuItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 13,
    },
    menuItemText: {
        fontSize: 15,
        fontWeight: "500",
        color: C.text,
    },
    menuDivider: {
        height: 1,
        backgroundColor: C.border,
        marginHorizontal: 12,
    },

    // Delete sheet
    sheetBackdrop: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.45)",
        justifyContent: "flex-end",
    },
    deleteSheet: {
        backgroundColor: C.card,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: 40,
        gap: 14,
        alignItems: "center",
    },
    deleteIconWrap: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: C.dangerFaded,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 4,
    },
    deleteTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: C.text,
        letterSpacing: -0.3,
    },
    deleteSubtitle: {
        fontSize: 14,
        color: C.textSecondary,
        textAlign: "center",
        lineHeight: 22,
    },
    deleteConfirmBtn: {
        width: "100%",
        backgroundColor: C.danger,
        borderRadius: 14,
        paddingVertical: 15,
        alignItems: "center",
        marginTop: 6,
    },
    deleteConfirmText: {
        fontSize: 16,
        fontWeight: "700",
        color: "#fff",
    },
    deleteCancelBtn: {
        width: "100%",
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: "center",
        backgroundColor: C.bg,
        borderWidth: 1,
        borderColor: C.border,
    },
    deleteCancelText: {
        fontSize: 15,
        fontWeight: "600",
        color: C.textSecondary,
    },

    // ── Cloth return status ───────────────────────────────────────────────────
    clothTopRight: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    unitChipReturned: {
        borderColor: C.success,
        backgroundColor: C.successFaded,
    },
    returnedCountText: {
        fontSize: 12,
        fontWeight: "600",
        color: C.success,
        marginTop: 2,
    },

    // ── Return buttons on dates card ─────────────────────────────────────────
    returnBtnsRow: {
        flexDirection: "row",
        gap: 10,
        marginTop: 2,
    },
    allReturnBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 7,
        paddingVertical: 13,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: C.primary,
        backgroundColor: C.primaryFaded,
    },
    allReturnBtnText: {
        fontSize: 13,
        fontWeight: "700",
        color: C.primary,
    },
    someReturnBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 7,
        paddingVertical: 13,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: C.border,
        backgroundColor: C.bg,
    },
    someReturnBtnText: {
        fontSize: 13,
        fontWeight: "700",
        color: C.textSecondary,
    },
    allReturnedBanner: {
        flexDirection: "row",
        alignItems: "center",
        gap: 9,
        paddingVertical: 13,
        paddingHorizontal: 14,
        borderRadius: 12,
        backgroundColor: C.successFaded,
        borderWidth: 1,
        borderColor: "#A7F3D0",
        marginTop: 2,
    },
    allReturnedText: {
        fontSize: 14,
        fontWeight: "700",
        color: C.success,
    },

    // ── Partial return sheet ──────────────────────────────────────────────────
    returnSheet: {
        backgroundColor: C.card,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingTop: 14,
        paddingBottom: 36,
        maxHeight: "80%",
        gap: 14,
    },
    sheetHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: C.border,
        alignSelf: "center",
        marginBottom: 4,
    },
    returnSheetHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    returnSheetTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: C.text,
        letterSpacing: -0.3,
    },
    returnSheetClose: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: C.bg,
        alignItems: "center",
        justifyContent: "center",
    },
    returnSheetSubtitle: {
        fontSize: 13,
        color: C.textSecondary,
        marginTop: -6,
    },

    // Checklist
    checklistClothBlock: {
        backgroundColor: C.bg,
        borderRadius: 14,
        padding: 14,
        gap: 10,
        borderWidth: 1,
        borderColor: C.border,
    },
    checklistClothLabel: {
        fontSize: 14,
        fontWeight: "700",
        color: C.text,
        letterSpacing: -0.1,
        marginBottom: 2,
    },
    checklistRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 8,
        paddingHorizontal: 4,
        borderRadius: 10,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 7,
        borderWidth: 2,
        borderColor: C.border,
        backgroundColor: C.card,
        alignItems: "center",
        justifyContent: "center",
    },
    checkboxChecked: {
        backgroundColor: C.primary,
        borderColor: C.primary,
    },
    checklistUnitInfo: {
        flexDirection: "row",
        alignItems: "center",
        gap: 7,
        flex: 1,
    },
    checklistUnitText: {
        fontSize: 14,
        fontWeight: "500",
        color: C.text,
    },
    returnedBadge: {
        backgroundColor: C.successFaded,
        borderRadius: 99,
        paddingHorizontal: 9,
        paddingVertical: 3,
        borderWidth: 1,
        borderColor: "#A7F3D0",
    },
    returnedBadgeText: {
        fontSize: 11,
        fontWeight: "700",
        color: C.success,
    },

    // ── Payment edit mode ────────────────────────────────────────────────────
    paymentEditIcon: {
        width: 34,
        height: 34,
        borderRadius: 10,
        backgroundColor: C.primaryFaded,
        alignItems: "center",
        justifyContent: "center",
    },
    paymentInputWrapper: {
        gap: 7,
    },
    paymentInputLabel: {
        fontSize: 13,
        fontWeight: "600",
        color: C.textSecondary,
        letterSpacing: 0.1,
    },
    paymentInput: {
        borderWidth: 1.5,
        borderColor: C.primary,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 13,
        fontSize: 16,
        fontWeight: "600",
        color: C.text,
        backgroundColor: C.primaryFaded,
    },
    paymentErrorRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 7,
        paddingHorizontal: 4,
    },
    paymentErrorText: {
        fontSize: 13,
        color: C.danger,
        flex: 1,
    },
    paymentEditActions: {
        flexDirection: "row",
        gap: 10,
        marginTop: 2,
    },
    paymentCancelBtn: {
        flex: 1,
        paddingVertical: 13,
        borderRadius: 12,
        alignItems: "center",
        backgroundColor: C.bg,
        borderWidth: 1,
        borderColor: C.border,
    },
    paymentCancelText: {
        fontSize: 14,
        fontWeight: "600",
        color: C.textSecondary,
    },
    paymentSaveBtn: {
        flex: 2,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 7,
        paddingVertical: 13,
        borderRadius: 12,
        backgroundColor: C.primary,
        shadowColor: C.primary,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 4,
    },
    paymentSaveText: {
        fontSize: 14,
        fontWeight: "700",
        color: "#fff",
    },

    // Fully paid banner
    fullyPaidBanner: {
        flexDirection: "row",
        alignItems: "center",
        gap: 9,
        paddingVertical: 13,
        paddingHorizontal: 14,
        borderRadius: 12,
        backgroundColor: C.successFaded,
        borderWidth: 1,
        borderColor: "#A7F3D0",
    },
    fullyPaidText: {
        fontSize: 14,
        fontWeight: "700",
        color: C.success,
    },

    // ── Payment history log ───────────────────────────────────────────────────
    historyToggleRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingVertical: 4,
    },
    historyToggleText: {
        fontSize: 13,
        fontWeight: "600",
        color: C.textSecondary,
    },
    historyList: {
        backgroundColor: C.bg,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: C.border,
        overflow: "hidden",
    },
    historyRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 12,
        paddingHorizontal: 14,
    },
    historyRowBorder: {
        borderBottomWidth: 1,
        borderBottomColor: C.border,
    },
    historyDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: C.primary,
    },
    historyNote: {
        fontSize: 13,
        fontWeight: "600",
        color: C.text,
    },
    historyDate: {
        fontSize: 11,
        color: C.textMuted,
    },
    historyAmount: {
        fontSize: 13,
        fontWeight: "700",
        color: C.success,
    },

    // Confirm returns button
    returnConfirmBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        backgroundColor: C.primary,
        borderRadius: 14,
        paddingVertical: 15,
        marginTop: 4,
        shadowColor: C.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 5,
    },
    returnConfirmText: {
        fontSize: 15,
        fontWeight: "700",
        color: "#fff",
    },
});