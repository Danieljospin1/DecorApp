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
    Share,
    Alert,
    TextInput,
    Linking
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

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

// ─── Dummy Booking Data ───────────────────────────────────────────────────────
const DUMMY_BOOKING = {
    id: "BK-2026-0042",
    clientName: "Kalisa Jean Pierre",
    clientPhone: "+250 788 123 456",
    clientType: "Decorator",
    status: "active",
    bookingDate: new Date(2026, 6, 29),
    returnDate: new Date(2026, 7, 2),
    clothes: [
        { id: "gown", label: "Gown", quantity: 2, units: [] },
        { id: "ikoti", label: "Ikoti", quantity: 2, units: [{ color: "Black", size: "32" }, { color: "Blue", size: "30" }] },
        { id: "ishati", label: "Ishati", quantity: 1, units: [{ color: "White", size: "L" }] },
    ],
    photos: [
        "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=300",
        "https://images.unsplash.com/photo-1555529771-835f59fc5efe?w=300",
        "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=300",
    ],
    totalAmount: 150000,
    amountPaid: 50000,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatDate = (date) => {
    const d = String(date.getDate()).padStart(2, "0");
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
};

const formatRWF = (n) =>
    n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");

const getDaysInfo = (returnDate) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const ret = new Date(returnDate);
    ret.setHours(0, 0, 0, 0);
    const diff = Math.round((ret - today) / (1000 * 60 * 60 * 24));
    if (diff > 0) return { label: `${diff} day${diff !== 1 ? "s" : ""} remaining`, type: "ok" };
    if (diff === 0) return { label: "Due today", type: "warning" };
    return { label: `${Math.abs(diff)} day${Math.abs(diff) !== 1 ? "s" : ""} overdue`, type: "overdue" };
};

const STATUS_CONFIG = {
    active: { label: "Active", color: C.primary, bg: C.primaryFaded },
    returned: { label: "Returned", color: C.success, bg: C.successFaded },
    overdue: { label: "Overdue", color: C.danger, bg: C.dangerFaded },
};

const COLOR_DOT = {
    White: "#FFFFFF",
    Black: "#1E293B",
    Blue: "#3B82F6",
    Gold: "#F59E0B",
    Red: "#EF4444",
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

    const booking = DUMMY_BOOKING; // swap for route.params.booking later

    const [menuVisible, setMenuVisible] = useState(false);
    const [deleteVisible, setDeleteVisible] = useState(false);

    //calling client directly
    const callClient = useCallback(async () => {
        const url = `tel:${booking.clientPhone.replace(/\s+/g, "")}`;

        try {
            await Linking.openURL(url);
        } catch (e) {
            Alert.alert(
                "Cannot make call",
                "Something went wrong opening the phone app."
            );
        }
    }, [booking.clientPhone]);

    // ── Return tracking state ─────────────────────────────────────────────────
    const [returnState, setReturnState] = useState(() =>
        booking.clothes.map(cloth => ({
            id: cloth.id,
            label: cloth.label,
            quantity: cloth.quantity,
            // clothes with units: copy each unit and add returned flag
            units: cloth.units.map(u => ({ ...u, returned: false })),
            // clothes without units (e.g. Gown): track by count
            returnedCount: 0,
        }))
    );

    const [partialSheetVisible, setPartialSheetVisible] = useState(false);
    const [draftReturn, setDraftReturn] = useState([]);

    // ── Return helpers ────────────────────────────────────────────────────────
    const getReturnStatus = useCallback((item) => {
        const returned = item.units.length > 0
            ? item.units.filter(u => u.returned).length
            : item.returnedCount;
        if (returned === 0) return "none";
        if (returned === item.quantity) return "all";
        return "partial";
    }, []);

    const allReturned = useMemo(
        () => returnState.every(item => getReturnStatus(item) === "all"),
        [returnState, getReturnStatus]
    );

    // Mark every unit of every cloth as returned
    const handleAllReturned = useCallback(() => {
        Alert.alert(
            "Confirm Return",
            "Mark all clothes as returned?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Confirm",
                    onPress: () =>
                        setReturnState(prev =>
                            prev.map(item => ({
                                ...item,
                                returnedCount: item.quantity,
                                units: item.units.map(u => ({ ...u, returned: true })),
                            }))
                        ),
                },
            ]
        );
    }, []);

    // Open partial sheet with a draft copy
    const openPartialSheet = useCallback(() => {
        setDraftReturn(
            returnState.map(item => ({
                ...item,
                units: item.units.map(u => ({ ...u })),
            }))
        );
        setPartialSheetVisible(true);
    }, [returnState]);

    // Toggle one unit inside the draft (for clothes WITH units)
    const toggleDraftUnit = useCallback((clothId, unitIndex) => {
        setDraftReturn(prev =>
            prev.map(item => {
                if (item.id !== clothId) return item;
                const units = item.units.map((u, i) =>
                    i === unitIndex ? { ...u, returned: !u.returned } : u
                );
                return { ...item, units, returnedCount: units.filter(u => u.returned).length };
            })
        );
    }, []);

    // Toggle one anonymous unit (for clothes WITHOUT units, tracked by count)
    const toggleDraftAnonymous = useCallback((clothId, unitIndex) => {
        setDraftReturn(prev =>
            prev.map(item => {
                if (item.id !== clothId) return item;
                // represent anonymous units as a boolean array derived from returnedCount
                const slots = Array.from({ length: item.quantity }, (_, i) =>
                    i < item.returnedCount
                );
                slots[unitIndex] = !slots[unitIndex];
                const newCount = slots.filter(Boolean).length;
                return { ...item, returnedCount: newCount };
            })
        );
    }, []);

    // Commit draft to real state
    const confirmPartial = useCallback(() => {
        setReturnState(draftReturn);
        setPartialSheetVisible(false);
    }, [draftReturn]);

    // ── Payment state ─────────────────────────────────────────────────────────
    const [totalAmount, setTotalAmount] = useState(booking.totalAmount);
    const [amountPaid, setAmountPaid] = useState(booking.amountPaid);
    const [paymentEditMode, setPaymentEditMode] = useState(false);

    // Draft values — only committed on Save
    const [draftTotal, setDraftTotal] = useState(String(booking.totalAmount));
    const [draftPaid, setDraftPaid] = useState(String(booking.amountPaid));
    const [paymentError, setPaymentError] = useState("");

    // Payment history log
    const [paymentHistory, setPaymentHistory] = useState([
        { id: "1", amount: booking.amountPaid, date: formatDate(booking.bookingDate), note: "Initial deposit" },
    ]);
    const [historyVisible, setHistoryVisible] = useState(false);

    // Derived
    const remaining = totalAmount - amountPaid;
    const fullyPaid = remaining === 0;

    // Draft remaining — updates live while editing
    const draftRemaining = Math.max(
        0,
        (parseInt(draftTotal) || 0) - (parseInt(draftPaid) || 0)
    );

    const openPaymentEdit = useCallback(() => {
        setDraftTotal(String(totalAmount));
        setDraftPaid(String(amountPaid));
        setPaymentError("");
        setPaymentEditMode(true);
    }, [totalAmount, amountPaid]);

    const cancelPaymentEdit = useCallback(() => {
        setPaymentEditMode(false);
        setPaymentError("");
    }, []);

    const savePayment = useCallback(() => {
        const newTotal = parseInt(draftTotal) || 0;
        const newPaid = parseInt(draftPaid) || 0;

        // Validation
        if (newTotal <= 0) {
            setPaymentError("Total amount must be greater than 0.");
            return;
        }
        if (newPaid < 0) {
            setPaymentError("Amount paid cannot be negative.");
            return;
        }
        if (newPaid > newTotal) {
            setPaymentError("Amount paid cannot exceed total amount.");
            return;
        }

        // If paid amount increased, append to history
        if (newPaid > amountPaid) {
            const addedNow = newPaid - amountPaid;
            setPaymentHistory(prev => [
                ...prev,
                {
                    id: String(Date.now()),
                    amount: addedNow,
                    date: formatDate(new Date()),
                    note: "Payment recorded",
                },
            ]);
        }

        setTotalAmount(newTotal);
        setAmountPaid(newPaid);
        setPaymentEditMode(false);
        setPaymentError("");
    }, [draftTotal, draftPaid, amountPaid]);

    const daysInfo = getDaysInfo(booking.returnDate);
    const status = STATUS_CONFIG[booking.status];

    // ── Share ────────────────────────────────────────────────────────────────────
    const handleShare = useCallback(async () => {
        const clothSummary = booking.clothes.map(c => {
            const units = c.units.map(u =>
                [u.color, u.size].filter(Boolean).join("/")
            ).join(", ");
            return units
                ? `${c.label} x${c.quantity} (${units})`
                : `${c.label} x${c.quantity}`;
        }).join("\n  ");

        const message =
            `MyDecor Booking - ${booking.id}

Client: ${booking.clientName}
Phone:  ${booking.clientPhone}
Type:   ${booking.clientType}

Items:
  ${clothSummary}

Booking Date: ${formatDate(booking.bookingDate)}
Return Date:  ${formatDate(booking.returnDate)}

Total:     ${formatRWF(totalAmount)} RWF
Paid:      ${formatRWF(amountPaid)} RWF
Remaining: ${formatRWF(remaining)} RWF`;

        try {
            await Share.share({ message });
        } catch (e) {
            console.log(e);
        }
    }, [booking, remaining]);

    // ── Delete ───────────────────────────────────────────────────────────────────
    const handleDelete = useCallback(() => {
        setMenuVisible(false);
        setTimeout(() => setDeleteVisible(true), 300);
    }, []);

    const confirmDelete = useCallback(() => {
        setDeleteVisible(false);
        navigation?.goBack();
    }, [navigation]);

    // ── Custom header ────────────────────────────────────────────────────────────
    useEffect(() => {
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
                        onPress={handleShare}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="share-outline" size={21} color={C.text} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={headerStyles.iconBtn}
                        onPress={() => navigation?.navigate("NewBooking", { booking })}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="create-outline" size={21} color={C.primary} />
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
    }, [booking, handleShare]);

    // ─────────────────────────────────────────────────────────────────────────────
    return (
        <View style={{ flex: 1, backgroundColor: C.bg }}>
            <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

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
                            onPress={() => { setMenuVisible(false); navigation?.navigate("NewBooking", { booking }); }}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="create-outline" size={19} color={C.primary} />
                            <Text style={[detailStyles.menuItemText, { color: C.primary }]}>Edit Booking</Text>
                        </TouchableOpacity>

                        <View style={detailStyles.menuDivider} />

                        <TouchableOpacity
                            style={detailStyles.menuItem}
                            onPress={() => { setMenuVisible(false); handleShare(); }}
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
                            {"This will permanently remove\n"}
                            <Text style={{ fontWeight: "700", color: C.text }}>
                                {booking.clientName}
                            </Text>
                            {"'s booking.\nThis cannot be undone."}
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
                            <Text style={detailStyles.returnSheetTitle}>Mark Returned Items</Text>
                            <TouchableOpacity
                                onPress={() => setPartialSheetVisible(false)}
                                style={detailStyles.returnSheetClose}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="close" size={20} color={C.textSecondary} />
                            </TouchableOpacity>
                        </View>
                        <Text style={detailStyles.returnSheetSubtitle}>
                            Check each item that has been returned
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

            {/* ── Scroll content ── */}
            <ScrollView
                contentContainerStyle={detailStyles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Booking ID + status */}
                <View style={detailStyles.metaRow}>
                    <Text style={detailStyles.bookingId}>{booking.id}</Text>
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
                            <View style={detailStyles.typePill}>
                                <Text style={detailStyles.typePillText}>{booking.clientType}</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </SectionCard>

                {/* ── Booked Items ── */}
                <SectionCard>
                    <SectionHeader icon="" title="Bookings" badge={booking.clothes.length} />

                    {returnState.map((item, ci) => {
                        const rStatus = getReturnStatus(item);

                        // Icon beside quantity badge
                        const returnIcon =
                            rStatus === "all" ? { name: "checkmark-circle", color: C.success } :
                                rStatus === "partial" ? { name: "time", color: C.warning } :
                                    { name: "time-outline", color: C.textMuted };

                        return (
                            <View
                                key={item.id}
                                style={[
                                    detailStyles.clothRow,
                                    ci < returnState.length - 1 && detailStyles.clothRowBorder,
                                ]}
                            >
                                {/* Top row: label + status icon + qty badge */}
                                <View style={detailStyles.clothTopRow}>
                                    <Text style={detailStyles.clothLabel}>{item.label}</Text>

                                    <View style={detailStyles.clothTopRight}>
                                        <Ionicons
                                            name={returnIcon.name}
                                            size={18}
                                            color={returnIcon.color}
                                        />
                                        <View style={detailStyles.qtyBadge}>
                                            <Text style={detailStyles.qtyBadgeText}>x{item.quantity}</Text>
                                        </View>
                                    </View>
                                </View>

                                {/* Per-unit chips */}
                                {item.units.length > 0 && (
                                    <View style={detailStyles.unitsWrap}>
                                        {item.units.map((unit, ui) => (
                                            <View
                                                key={ui}
                                                style={[
                                                    detailStyles.unitChip,
                                                    unit.returned && detailStyles.unitChipReturned,
                                                ]}
                                            >
                                                {unit.color && <ColorDot color={unit.color} />}
                                                <Text style={[
                                                    detailStyles.unitChipText,
                                                    unit.returned && { color: C.success },
                                                ]}>
                                                    {[unit.color, unit.size].filter(Boolean).join(" · ")}
                                                </Text>
                                                {unit.returned && (
                                                    <Ionicons name="checkmark-circle" size={13} color={C.success} />
                                                )}
                                            </View>
                                        ))}
                                    </View>
                                )}

                                {/* Anonymous units (no color/size) — show returned count */}
                                {item.units.length === 0 && item.returnedCount > 0 && (
                                    <Text style={detailStyles.returnedCountText}>
                                        {item.returnedCount} of {item.quantity} returned
                                    </Text>
                                )}
                            </View>
                        );
                    })}
                </SectionCard>

                {/* ── Photos ── */}
                {booking.photos.length > 0 && (
                    <SectionCard>
                        <SectionHeader icon="" title="Photos" badge={booking.photos.length} />
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={detailStyles.photoScroll}
                        >
                            {booking.photos.map((uri, i) => (
                                <TouchableOpacity key={i} activeOpacity={0.85} style={detailStyles.photoWrapper}>
                                    <Image source={{ uri }} style={detailStyles.photo} resizeMode="cover" />
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </SectionCard>
                )}

                {/* ── Dates ── */}
                <SectionCard>
                    <SectionHeader icon="" title="Dates" />

                    <View style={detailStyles.datesGrid}>
                        <View style={detailStyles.dateBlock}>
                            <Text style={detailStyles.dateBlockLabel}>Booking Date</Text>
                            <Text style={detailStyles.dateBlockValue}>{formatDate(booking.bookingDate)}</Text>
                        </View>
                        <View style={detailStyles.dateArrowWrap}>
                            <Ionicons name="arrow-forward" size={16} color={C.textMuted} />
                        </View>
                        <View style={[detailStyles.dateBlock, { alignItems: "flex-end" }]}>
                            <Text style={detailStyles.dateBlockLabel}>Return Date</Text>
                            <Text style={detailStyles.dateBlockValue}>{formatDate(booking.returnDate)}</Text>
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
                        // All returned — show green confirmation banner
                        <View style={detailStyles.allReturnedBanner}>
                            <Ionicons name="checkmark-circle" size={20} color={C.success} />
                            <Text style={detailStyles.allReturnedText}>Imyenda yose yataruwe</Text>
                        </View>
                    ) : (
                        // Return action buttons
                        <View style={detailStyles.returnBtnsRow}>
                            <TouchableOpacity
                                style={detailStyles.allReturnBtn}
                                onPress={handleAllReturned}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="checkmark-done-outline" size={16} color={C.primary} />
                                <Text style={detailStyles.allReturnBtnText}>Yose yataruwe</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={detailStyles.someReturnBtn}
                                onPress={openPartialSheet}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="list-outline" size={16} color={C.textSecondary} />
                                <Text style={detailStyles.someReturnBtnText}>Imyenda yataruwe</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </SectionCard>

                {/* ── Payment ── */}
                <SectionCard>

                    {/* Header row with edit pencil */}
                    <View style={detailStyles.sectionHeaderRow}>

                        <Text style={[detailStyles.sectionTitle, { flex: 1 }]}>Payment</Text>
                        {!paymentEditMode && !fullyPaid && (
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
                                <Text style={detailStyles.paymentInputLabel}>Ayishyuwe kugeza ubu (RWF)</Text>
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
                                value={`${formatRWF(totalAmount)} RWF`}
                                valueStyle={detailStyles.paymentTotal}
                            />
                            <View style={detailStyles.paymentDivider} />
                            <InfoRow
                                label="Ayishyuwe"
                                value={`${formatRWF(amountPaid)} RWF`}
                                valueStyle={{ color: C.success, fontWeight: "600" }}
                            />

                            {/* Remaining or fully paid banner */}
                            {fullyPaid ? (
                                <View style={detailStyles.fullyPaidBanner}>
                                    <Ionicons name="checkmark-circle" size={20} color={C.success} />
                                    <Text style={detailStyles.fullyPaidText}>Yose yishyuwe</Text>
                                </View>
                            ) : (
                                <View style={detailStyles.remainingBlock}>
                                    <View>
                                        <Text style={detailStyles.remainingLabel}>Remaining Balance</Text>
                                        <Text style={detailStyles.remainingNote}>Auto-calculated</Text>
                                    </View>
                                    <Text style={detailStyles.remainingAmount}>
                                        {formatRWF(remaining)} RWF
                                    </Text>
                                </View>
                            )}
                        </>
                    )}

                    {/* ── Payment history log ── */}
                    {paymentHistory.length > 0 && !paymentEditMode && (
                        <>
                            <TouchableOpacity
                                style={detailStyles.historyToggleRow}
                                onPress={() => setHistoryVisible(v => !v)}
                                activeOpacity={0.7}
                            >
                                <Ionicons
                                    name={historyVisible ? "chevron-up" : "chevron-down"}
                                    size={15}
                                    color={C.textSecondary}
                                />
                                <Text style={detailStyles.historyToggleText}>
                                    Payment history · {paymentHistory.length} {paymentHistory.length === 1 ? "entry" : "entries"}
                                </Text>
                            </TouchableOpacity>

                            {historyVisible && (
                                <View style={detailStyles.historyList}>
                                    {paymentHistory.map((entry, i) => (
                                        <View
                                            key={entry.id}
                                            style={[
                                                detailStyles.historyRow,
                                                i < paymentHistory.length - 1 && detailStyles.historyRowBorder,
                                            ]}
                                        >
                                            {/* Left: dot + note + date */}
                                            <View style={detailStyles.historyDot} />
                                            <View style={{ flex: 1, gap: 2 }}>
                                                <Text style={detailStyles.historyNote}>{entry.note}</Text>
                                                <Text style={detailStyles.historyDate}>{entry.date}</Text>
                                            </View>
                                            {/* Right: amount */}
                                            <Text style={detailStyles.historyAmount}>
                                                +{formatRWF(entry.amount)} RWF
                                            </Text>
                                        </View>
                                    ))}
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