import React, { useState, useCallback, useMemo } from "react";
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, StatusBar, Image, Platform, KeyboardAvoidingView, Modal, ActivityIndicator, FlatList,Alert } from "react-native";
import Ionicons from '@expo/vector-icons/Ionicons';
import { MultiSelect } from "react-native-element-dropdown";
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Contacts from 'expo-contacts';
import { saveBookingImages } from "../utils/fileHandler";
import { createBooking } from "../database/queries/newBookingQuery";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
// ─── Design Tokens ────────────────────────────────────────────────────────────
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
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
let _id = 1;
const uid = () => String(_id++);

const makeItem = () => ({
    id: uid(),
    clothType: "Princess Gown",
    color: "White",
    size: "M",
    quantity: 1,
    photos: [null, null, null],
});


const CLOTH_CONFIG = {
    gown: { label: "Ikanzu y' abageni", hasColor: false, hasSize: false, sizeType: null },
    malene: { label: "Ikanzu ya Malene", hasColor: false, hasSize: false, sizeType: null },
    suit: { label: "Costume (ikoti n' ipantaro)", hasColor: true, hasSize: false, sizeType: null },
    ikoti: { label: "Ikoti", hasColor: true, hasSize: true, sizeType: "number" },
    ishati: { label: "Ishati", hasColor: true, hasSize: true, sizeType: "letter" },
    umukenyero: { label: "Umukenyero", hasColor: false, hasSize: false, sizeType: null },
    bridesUmukenyero: { label: "Umukenyero(umugeni)", hasColor: false, hasSize: false, hasType: null },
    groomsUmukenyero: { label: "Umukenyero(umukwe)", hasColor: false, hasSize: false, hasType: null },
    boysUmukenyero: { label: "Umukenyero(abasore)", hasColor: false, hasSize: false, hasType: null },
    childrenUmukenyero: { label: "Umukenyero(abana)", hasColor: false, hasSize: false, hasType: null },
    top: { label: "Top", hasColor: true, hasSize: false, hasType: null },
    tie: { label: "Cravat", hasColor: false, hasSize: false, hasType: null },
    noeud: { label: "Noeud (🎀)", hasColor: false, hasSize: false, hasType: null },
    inkangara: { label: "Inkangara", hasColor: false, hasSize: false, hasType: null },
    ibiseke: { label: "Ibiseke", hasColor: false, hasSize: false, hasType: null },
    inkongoro: { label: "Inkongoro", hasColor: false, hasSize: false, hasType: null },
    inigi: { label: "Inigi", hasColor: false, hasSize: false, hasType: null },
    sakame: { label: "Sakame", hasColor: false, hasSize: false, hasType: null },
    ururabo: { label: "Ururabo", hasColor: false, hasSize: false, hasType: null },
    masaye: { label: "Masaye", hasColor: false, hasSize: false, hasType: null },
    inkoni: { label: "Inkoni", hasColor: false, hasSize: false, hasType: null },
};
const CLOTH_TYPES = Object.entries(CLOTH_CONFIG).map(([id, c]) => ({
    value: id,
    label: c.label,
}));
const SIZE_SCALES = {
    letter: ["XS", "S", "M", "L", "XL", "XXL"],
    number: ["28", "30", "32", "34", "36", "38"],
};

const COLORS = [
    "White", "Black", "Blue", "Gold", "Red",
    "Dark Blue", "Gray", "Light Gray", "Chocolate", "Dark Red", "Dark Green",
    "Green", "Tan", "Pink",
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
    Chocolate: "#7B3F00",
    "Dark Red": "#991B1B",
    "Dark Green": "#166534",
    Green: "#22C55E",
    Tan: "#D2B48C",
    Pink: "#EC4899",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionCard({ children, style }) {
    return <View style={[styles.card, style]}>{children}</View>;
}

function SectionHeader({ icon, title }) {
    return (
        <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionIcon}>{icon}</Text>
            <Text style={styles.sectionTitle}>{title}</Text>
        </View>
    );
}

function OutlinedInput({ label, value, onChange, keyboardType = "default", placeholder }) {
    const [focused, setFocused] = useState(false);
    return (
        <View style={styles.inputWrapper}>
            {label ? <Text style={styles.inputLabel}>{label}</Text> : null}
            <TextInput
                style={[styles.textInput, focused && styles.textInputFocused]}
                value={value}
                onChangeText={onChange}
                placeholder={placeholder || label}
                placeholderTextColor={C.textMuted}
                keyboardType={keyboardType}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
            />
        </View>
    );
}
//contacts handler
function useContactPicker(setClientName, setPhone) {

    const [sheetVisible, setSheetVisible] = useState(false);
    const [contacts, setContacts] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [dupeModalVisible, setDupeModalVisible] = useState(false);
    const [dupeGroup, setDupeGroup] = useState([]);

    // ── Permission + load ─────────────────────────────────────────────────────
    const openContactSheet = async () => {
        const { status } = await Contacts.requestPermissionsAsync();

        if (status !== "granted") {
            Alert.alert(
                "Permission needed",
                "Please allow access to your contacts in device settings.",
                [{ text: "OK" }]
            );
            return;
        }

        setLoading(true);
        setSheetVisible(true);

        const { data } = await Contacts.getContactsAsync({
            fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
        });

        const withPhone = data
            .filter(c => c.name && c.phoneNumbers?.length > 0)
            .sort((a, b) => a.name.localeCompare(b.name));

        setContacts(withPhone);
        setLoading(false);
    };

    // ── Pick a single contact (final step) ───────────────────────────────────
    const pickContact = useCallback((contact, phoneNumber) => {
        setClientName(contact.name);
        setPhone(phoneNumber.replace(/\s+/g, ""));
        setSheetVisible(false);
        setDupeModalVisible(false);
        setSearchQuery("");
    }, [setClientName, setPhone]);

    // ── Handle tapping a contact row ─────────────────────────────────────────
    const handleContactPress = useCallback((contact) => {
        const numbers = contact.phoneNumbers;

        if (numbers.length === 1) {
            pickContact(contact, numbers[0].number);
        } else {
            setDupeGroup(
                numbers.map(n => ({ ...contact, _resolvedNumber: n }))
            );
            setDupeModalVisible(true);
        }
    }, [pickContact]);

    const closeDupeModal = useCallback(() => {
        setDupeModalVisible(false);
        setDupeGroup([]);
    }, []);

    const closeContactSheet = useCallback(() => {
        setSheetVisible(false);
        setSearchQuery("");
    }, []);

    // ── Filtered list — derived, not state ───────────────────────────────────
    const filteredContacts = useMemo(() => {
        if (searchQuery.trim() === "") return contacts;
        const q = searchQuery.toLowerCase();
        return contacts.filter(c =>
            c.name.toLowerCase().includes(q) ||
            c.phoneNumbers.some(n => n.number.includes(searchQuery))
        );
    }, [contacts, searchQuery]);

    // ── Single render function — no nested component definitions ──────────────
    const renderModals = () => (
        <>
            {/* ── Contact list bottom sheet ── */}
            <Modal
                visible={sheetVisible}
                transparent
                animationType="slide"
                onRequestClose={closeContactSheet}
            >
                <View style={contactStyles.backdrop}>
                    {/* Tap backdrop to close */}
                    <TouchableOpacity
                        style={{ flex: 1 }}
                        activeOpacity={1}
                        onPress={closeContactSheet}
                    />

                    <View style={contactStyles.sheet}>
                        <View style={contactStyles.sheetHandle} />

                        {/* Header */}
                        <View style={contactStyles.sheetHeaderRow}>
                            <Text style={contactStyles.sheetTitle}>Contacts</Text>
                            <TouchableOpacity
                                onPress={closeContactSheet}
                                style={contactStyles.closeBtn}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="close" size={20} color={C.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        {/* Search bar */}
                        <View style={contactStyles.searchBar}>
                            <Ionicons name="search-outline" size={17} color={C.textMuted} />
                            <TextInput
                                style={contactStyles.searchInput}
                                placeholder="Search name or number..."
                                placeholderTextColor={C.textMuted}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                autoCorrect={false}
                                cursorColor={C.primary}
                            />
                            {searchQuery.length > 0 && (
                                <TouchableOpacity onPress={() => setSearchQuery("")}>
                                    <Ionicons name="close-circle" size={17} color={C.textMuted} />
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* List / loading / empty */}
                        {loading ? (
                            <View style={contactStyles.centered}>
                                <ActivityIndicator size="large" color={C.primary} />
                                <Text style={contactStyles.loadingText}>Loading contacts...</Text>
                            </View>
                        ) : filteredContacts.length === 0 ? (
                            <View style={contactStyles.centered}>
                                <Ionicons name="person-outline" size={40} color={C.textMuted} />
                                <Text style={contactStyles.emptyText}>No contacts found</Text>
                            </View>
                        ) : (
                            <FlatList
                                data={filteredContacts}
                                keyExtractor={item => item.id}
                                showsVerticalScrollIndicator={false}
                                keyboardShouldPersistTaps="handled"
                                contentContainerStyle={{ paddingBottom: 20 }}
                                ItemSeparatorComponent={() => (
                                    <View style={contactStyles.separator} />
                                )}
                                renderItem={({ item }) => {
                                    const initial = item.name?.charAt(0).toUpperCase() ?? "?";
                                    return (
                                        <TouchableOpacity
                                            style={contactStyles.contactRow}
                                            onPress={() => handleContactPress(item)}
                                            activeOpacity={0.7}
                                        >
                                            <View style={contactStyles.avatar}>
                                                <Text style={contactStyles.avatarText}>{initial}</Text>
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={contactStyles.contactName}>{item.name}</Text>
                                                <Text style={contactStyles.contactNumber} numberOfLines={1}>
                                                    {item.phoneNumbers.length > 1
                                                        ? `${item.phoneNumbers[0].number}  +${item.phoneNumbers.length - 1} more`
                                                        : item.phoneNumbers[0].number}
                                                </Text>
                                            </View>
                                            <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
                                        </TouchableOpacity>
                                    );
                                }}
                            />
                        )}
                    </View>
                </View>
            </Modal>

            {/* ── Dupe number resolver — separate Modal, not nested ── */}
            <Modal
                visible={dupeModalVisible}
                transparent
                animationType="fade"
                onRequestClose={closeDupeModal}
            >
                <TouchableOpacity
                    style={contactStyles.backdrop}
                    activeOpacity={1}
                    onPress={closeDupeModal}
                >
                    <TouchableOpacity
                        activeOpacity={1}
                        style={[contactStyles.sheet, { paddingBottom: 28 }]}
                        onPress={() => { }}
                    >
                        <View style={contactStyles.sheetHandle} />

                        <Text style={contactStyles.sheetTitle}>
                            {dupeGroup[0]?.name}
                        </Text>
                        <Text style={contactStyles.sheetSubtitle}>
                            Multiple numbers found. Choose one:
                        </Text>

                        {dupeGroup.map((entry, i) => (
                            <TouchableOpacity
                                key={i}
                                style={contactStyles.dupeRow}
                                onPress={() => pickContact(entry, entry._resolvedNumber.number)}
                                activeOpacity={0.75}
                            >
                                <View style={contactStyles.dupeIconWrap}>
                                    <Ionicons name="call-outline" size={18} color={C.primary} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={contactStyles.dupeNumber}>
                                        {entry._resolvedNumber.number}
                                    </Text>
                                    {entry._resolvedNumber.label && (
                                        <Text style={contactStyles.dupeLabel}>
                                            {entry._resolvedNumber.label}
                                        </Text>
                                    )}
                                </View>
                                <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
                            </TouchableOpacity>
                        ))}

                        <TouchableOpacity
                            style={contactStyles.cancelBtn}
                            onPress={closeDupeModal}
                            activeOpacity={0.7}
                        >
                            <Text style={contactStyles.cancelText}>Cancel</Text>
                        </TouchableOpacity>
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>
        </>
    );

    return { openContactSheet, renderModals };
}

// ─── Contact Styles ───────────────────────────────────────────────────────────
const contactStyles = StyleSheet.create({

    backdrop: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.45)",
        justifyContent: "flex-end",
    },
    sheet: {
        backgroundColor: C.card,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingTop: 14,
        maxHeight: "85%",
        gap: 12,
    },
    sheetHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: C.border,
        alignSelf: "center",
        marginBottom: 4,
    },
    sheetHeaderRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    sheetTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: C.text,
        letterSpacing: -0.3,
    },
    sheetSubtitle: {
        fontSize: 13,
        color: C.textSecondary,
    },
    closeBtn: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: C.bg,
        alignItems: "center",
        justifyContent: "center",
    },

    // Search
    searchBar: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        backgroundColor: C.bg,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: C.border,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: C.text,
        padding: 0,
    },

    // Contact rows
    contactRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 12,
    },
    separator: {
        height: 1,
        backgroundColor: C.border,
        marginLeft: 64,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: C.primaryLight,
        alignItems: "center",
        justifyContent: "center",
    },
    avatarText: {
        fontSize: 17,
        fontWeight: "700",
        color: C.primary,
    },
    contactName: {
        fontSize: 15,
        fontWeight: "600",
        color: C.text,
    },
    contactNumber: {
        fontSize: 12,
        color: C.textSecondary,
        marginTop: 2,
    },

    // Loading / empty
    centered: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 48,
        gap: 12,
    },
    loadingText: {
        fontSize: 14,
        color: C.textSecondary,
    },
    emptyText: {
        fontSize: 14,
        color: C.textMuted,
    },

    // Duplicate resolver
    dupeRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 14,
        paddingHorizontal: 14,
        borderRadius: 14,
        backgroundColor: C.bg,
        borderWidth: 1,
        borderColor: C.border,
    },
    dupeIconWrap: {
        width: 38,
        height: 38,
        borderRadius: 10,
        backgroundColor: C.primaryFaded,
        alignItems: "center",
        justifyContent: "center",
    },
    dupeNumber: {
        fontSize: 15,
        fontWeight: "600",
        color: C.text,
    },
    dupeLabel: {
        fontSize: 12,
        color: C.textSecondary,
        marginTop: 2,
        textTransform: "capitalize",
    },

    // Cancel button
    cancelBtn: {
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: "center",
        backgroundColor: C.bg,
        borderWidth: 1,
        borderColor: C.border,
        marginTop: 4,
    },
    cancelText: {
        fontSize: 15,
        fontWeight: "600",
        color: C.textSecondary,
    },
});

function SegmentedControl({ options, selected, onSelect }) {
    return (
        <View style={styles.segmented}>
            {options.map((opt) => {
                const active = selected === opt;
                return (
                    <TouchableOpacity
                        key={opt}
                        style={[styles.segment, active && styles.segmentActive]}
                        onPress={() => onSelect(opt)}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                            {opt}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

function Dropdown({ selectedClothTypes, onToggle }) {
    const [open, setOpen] = useState(false);

    // Derive just the id array for the MultiSelect value prop
    const selectedIds = selectedClothTypes.map(c => c.id);
    console.log("==============", selectedClothTypes);
    console.log("==============units", selectedClothTypes[0]);

    const handleChange = (newSelectedIds) => {
        // Figure out what changed
        const added = newSelectedIds.filter(id => !selectedIds.includes(id));
        const removed = selectedIds.filter(id => !newSelectedIds.includes(id));

        added.forEach(id => onToggle(id));
        removed.forEach(id => onToggle(id));
    };

    return (
        <View style={styles.inputWrapper}>
            <MultiSelect
                style={{ height: 50, borderWidth: 1, borderColor: "#ccc", borderRadius: 8, paddingHorizontal: 10, }}
                data={CLOTH_TYPES}                   // [{ label: "Ikoti", value: "ikoti" }, ...]
                labelField="label"
                valueField="value"
                search
                searchPlaceholder="Search..."
                placeholder="Hitamo ibyaba byafashwe..."
                placeholderStyle={{ color: "gray" }}
                value={selectedIds}                  // controlled by parent state
                onChange={handleChange}
                renderItem={(item) => {
                    const isSelected = selectedIds.includes(item.value);

                    return (
                        <View
                            style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 15, backgroundColor: isSelected ? C.primaryLight : "white", }}
                        >
                            <Text>{item.label}</Text>
                            {isSelected && (
                                <Ionicons name="checkmark" size={22} color={C.primary} />
                            )}
                        </View>
                    );
                }}
            />
        </View>
    );
}

//cloth dynamic properties setter

function useClothSelector(selectedClothTypes, setSelectedClothTypes) {

    // Build a fresh unit with defaults based on config
    const makeUnit = (config) => ({
        ...(config.hasColor && { color: "White" }),
        ...(config.hasSize && { size: SIZE_SCALES[config.sizeType][0] }),
    });

    // ── Toggle: add or remove a cloth type ──────────────────────────────────────
    const toggleClothType = useCallback((id) => {
        setSelectedClothTypes(prev => {
            const exists = prev.find(c => c.id === id);

            // Already selected → remove it
            if (exists) return prev.filter(c => c.id !== id);

            // Not selected → build the initial object
            const config = CLOTH_CONFIG[id];
            const needsUnits = config.hasColor || config.hasSize;

            return [...prev, {
                id,
                label: config.label,
                quantity: 1,
                units: needsUnits ? [makeUnit(config)] : [],
            }];
        });
    }, [setSelectedClothTypes]);

    // ── Change quantity: grow or shrink units array ──────────────────────────────
    const changeQuantity = useCallback((id, delta) => {
        setSelectedClothTypes(prev => prev.map(c => {
            if (c.id !== id) return c;

            const config = CLOTH_CONFIG[id];
            const newQty = Math.max(1, c.quantity + delta);
            const needsUnits = config.hasColor || config.hasSize;

            if (!needsUnits) return { ...c, quantity: newQty };

            let units = [...c.units];

            if (delta > 0) {
                // Adding a unit → append with defaults
                units.push(makeUnit(config));
            } else if (delta < 0 && units.length > 1) {
                // Removing a unit → pop the last one
                units.pop();
            }

            return { ...c, quantity: newQty, units };
        }));
    }, [setSelectedClothTypes]);

    // ── Update a single field on a specific unit ─────────────────────────────────
    const updateUnit = useCallback((clothId, unitIndex, key, value) => {
        setSelectedClothTypes(prev => prev.map(c => {
            if (c.id !== clothId) return c;

            const updatedUnits = c.units.map((unit, i) =>
                i === unitIndex ? { ...unit, [key]: value } : unit
            );

            return { ...c, units: updatedUnits };
        }));
    }, [setSelectedClothTypes]);

    // ── Render all cloth cards ───────────────────────────────────────────────────
    const renderClothCards = useCallback(() => {
        if (selectedClothTypes.length === 0) {
            return (
                <View style={styles.emptyClothHint}>
                    <Text style={styles.emptyClothHintText}>
                        Hitamo ibyaba byafashwe muri iyi booking.
                    </Text>
                </View>
            );
        }

        return selectedClothTypes.map((item) => {
            const config = CLOTH_CONFIG[item.id];
            const needsUnits = config.hasColor || config.hasSize;
            const sizeOptions = config.hasSize ? SIZE_SCALES[config.sizeType] : [];

            return (
                <View key={item.id} style={{ backgroundColor: C.primaryFaded, paddingLeft: 10, borderRadius: 10, paddingBottom: 10 }}>

                    {/* ── Card Header ── */}
                    <View style={styles.clothCardHead}>
                        <Text style={{ fontSize: 16, color: C.primary }}>{item.label} :</Text>
                    </View>

                    {/* ── Quantity selector (always shown) ── */}
                    <View style={styles.inputWrapper}>
                        <Text style={styles.inputLabel}>Umubare w' <Text>{item.label}</Text></Text>
                        <QuantitySelector
                            value={item.quantity}
                            onChange={(delta) => changeQuantity(item.id, delta)}
                        />
                    </View>

                    {/* ── Per-unit configuration (only if cloth has color or size) ── */}
                    {needsUnits && item.units.map((unit, index) => (
                        <View key={index} style={styles.unitRow}>

                            <Text style={{ alignSelf: 'center', fontSize: 15, paddingTop: 10 }}>
                                {item.quantity > 1 ? <Text>{item.label} ya {index + 1}</Text> : "Details"}
                            </Text>
                            <View style={{ borderWidth: 0.4, borderColor: 'gray' }}></View>

                            {/* Color chips */}
                            {config.hasColor && (
                                <View style={[styles.inputWrapper, { paddingTop: 10 }]}>
                                    <Text style={styles.inputLabel}>Color:</Text>
                                    <ChipGroup
                                        options={COLORS}
                                        selected={unit.color}
                                        onSelect={(v) => updateUnit(item.id, index, "color", v)}
                                        colorMode
                                    />
                                </View>
                            )}

                            {/* Size chips */}
                            {config.hasSize && (
                                <View style={[styles.inputWrapper, { paddingTop: 10 }]}>
                                    <Text style={styles.inputLabel}>Size: </Text>
                                    <ChipGroup
                                        options={sizeOptions}
                                        selected={unit.size}
                                        onSelect={(v) => updateUnit(item.id, index, "size", v)}
                                    />
                                </View>
                            )}

                        </View>
                    ))}

                </View>
            );
        });
    }, [selectedClothTypes, changeQuantity, updateUnit]);

    return { toggleClothType, changeQuantity, updateUnit, renderClothCards };
}


function ChipGroup({ options, selected, onSelect, colorMode }) {
    return (
        <View style={styles.chipRow}>
            {options.map((opt) => {
                const active = selected === opt;
                return (
                    <TouchableOpacity
                        key={opt}
                        style={[
                            styles.chip,
                            active && styles.chipActive,
                            colorMode && { borderColor: COLOR_DOT[opt] || C.border },
                        ]}
                        onPress={() => onSelect(opt)}
                        activeOpacity={0.7}
                    >
                        {colorMode && (
                            <View
                                style={[
                                    styles.colorDot,
                                    { backgroundColor: COLOR_DOT[opt] || "#ccc" },
                                    opt === "White" && styles.colorDotWhite,
                                ]}
                            />
                        )}
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt}</Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

function QuantitySelector({ value, onChange }) {
    return (
        <View style={styles.quantityRow}>
            <TouchableOpacity
                style={[styles.qtyBtn, value <= 1 && styles.qtyBtnDisabled]}
                onPress={() => value > 1 && onChange(-1)}  // ← delta, not value - 1
                activeOpacity={0.7}
            >
                <Text style={styles.qtyBtnText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.qtyValue}>{value}</Text>
            <TouchableOpacity
                style={styles.qtyBtn}
                onPress={() => onChange(+1)}               // ← delta, not value + 1
                activeOpacity={0.7}
            >
                <Text style={styles.qtyBtnText}>+</Text>
            </TouchableOpacity>
        </View>
    );
}


// image handler

function useImagePicker(images, setImages) {

    const [modalVisible, setModalVisible] = useState(false);

    // ── Request permissions ────────────────────────────────────────────────────
    const requestCameraPermission = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") {
            Alert.alert(
                "Permission needed",
                "Please allow camera access in your device settings to take photos.",
                [{ text: "OK" }]
            );
            return false;
        }
        return true;
    };

    const requestGalleryPermission = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
            Alert.alert(
                "Permission needed",
                "Please allow photo library access in your device settings to pick images.",
                [{ text: "OK" }]
            );
            return false;
        }
        return true;
    };

    // ── Launch camera ─────────────────────────────────────────────────────────
    const openCamera = async () => {
        setModalVisible(false);

        const granted = await requestCameraPermission();
        if (!granted) return;

        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.8,
        });

        if (!result.canceled && result.assets?.length > 0) {
            setImages(prev => [...prev, result.assets[0].uri]);
        }
    };

    // ── Launch gallery ─────────────────────────────────────────────────────────
    const openGallery = async () => {
        setModalVisible(false);

        const granted = await requestGalleryPermission();
        if (!granted) return;

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: true,
            quality: 0.8,
        });

        if (!result.canceled && result.assets?.length > 0) {
            const uris = result.assets.map(a => a.uri);
            setImages(prev => [...prev, ...uris]);
        }
    };

    // ── Remove a single image ──────────────────────────────────────────────────
    const removeImage = (index) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    };

    // ── Source picker modal ────────────────────────────────────────────────────
    const SourceModal = useCallback(() => (
        <Modal
            visible={modalVisible}
            transparent
            animationType="slide"
            onRequestClose={() => setModalVisible(false)}
        >
            {/* Backdrop */}
            <TouchableOpacity
                style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end", }}
                activeOpacity={1}
                onPress={() => setModalVisible(false)}
            >
                <StatusBar style="auto" backgroundColor='transparent' />
                {/* Sheet — stop tap propagation so tapping inside doesn't close */}
                <TouchableOpacity
                    activeOpacity={1}
                    style={imagePickerStyles.sheet}
                    onPress={() => { }}
                >
                    <View style={imagePickerStyles.sheetHandle} />

                    <Text style={imagePickerStyles.sheetTitle}>Add Photos</Text>
                    <Text style={imagePickerStyles.sheetSubtitle}>
                        Choose how you want to add photos of the clothes
                    </Text>

                    {/* Camera option */}
                    <TouchableOpacity
                        style={imagePickerStyles.optionBtn}
                        onPress={openCamera}
                        activeOpacity={0.75}
                    >
                        <View style={imagePickerStyles.optionIconWrap}>
                            <Ionicons name="camera" size={22} color={C.primary} />
                        </View>
                        <View style={imagePickerStyles.optionTextWrap}>
                            <Text style={imagePickerStyles.optionLabel}>Take a Photo</Text>
                            <Text style={imagePickerStyles.optionDesc}>Use your camera</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
                    </TouchableOpacity>

                    {/* Gallery option */}
                    <TouchableOpacity
                        style={imagePickerStyles.optionBtn}
                        onPress={openGallery}
                        activeOpacity={0.75}
                    >
                        <View style={imagePickerStyles.optionIconWrap}>
                            <Ionicons name="images" size={22} color={C.primary} />
                        </View>
                        <View style={imagePickerStyles.optionTextWrap}>
                            <Text style={imagePickerStyles.optionLabel}>Choose from Gallery</Text>
                            <Text style={imagePickerStyles.optionDesc}>Pick one or more photos</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
                    </TouchableOpacity>

                    {/* Cancel */}
                    <TouchableOpacity
                        style={imagePickerStyles.cancelBtn}
                        onPress={() => setModalVisible(false)}
                        activeOpacity={0.7}
                    >
                        <Text style={imagePickerStyles.cancelText}>Cancel</Text>
                    </TouchableOpacity>

                </TouchableOpacity>
            </TouchableOpacity>
        </Modal>
    ), [modalVisible]);

    // ── Image row renderer ─────────────────────────────────────────────────────
    const renderImageRow = useCallback(() => (
        <View style={imagePickerStyles.section}>

            {/* Add button */}
            <TouchableOpacity
                style={imagePickerStyles.addBtn}
                onPress={() => setModalVisible(true)}
                activeOpacity={0.75}
            >
                <Ionicons name="camera-outline" size={20} color={C.primary} />
                <Text style={imagePickerStyles.addBtnText}>Add Photos</Text>
            </TouchableOpacity>

            {/* Horizontal scroll of picked images */}
            {images.length > 0 && (
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={imagePickerStyles.imageScroll}
                >
                    {images.map((uri, index) => (
                        <View key={index} style={imagePickerStyles.imageWrapper}>

                            <Image
                                source={{ uri }}
                                style={imagePickerStyles.image}
                            />

                            {/* X button */}
                            <TouchableOpacity
                                style={imagePickerStyles.removeBtn}
                                onPress={() => removeImage(index)}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="close" size={12} color="#fff" />
                            </TouchableOpacity>

                        </View>
                    ))}
                </ScrollView>
            )}

        </View>
    ), [images]);

    return { renderImageRow, SourceModal };
}
// ─── Image Picker Styles ──────────────────────────────────────────────────────
const imagePickerStyles = StyleSheet.create({

    section: {
        gap: 12,
    },

    // Add button
    addBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        alignSelf: "flex-start",
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 10,
        borderWidth: 1.5,
        borderStyle: "dashed",
        borderColor: C.primary,
        backgroundColor: C.primaryFaded,
    },
    addBtnText: {
        fontSize: 13,
        fontWeight: "600",
        color: C.primary,
    },

    // Horizontal image scroll
    imageScroll: {
        gap: 10,
        paddingVertical: 4,
        paddingHorizontal: 2,
    },
    imageWrapper: {
        position: "relative",
    },
    image: {
        width: 90,
        height: 90,
        borderRadius: 12,
        backgroundColor: C.border,
    },

    // X remove button
    removeBtn: {
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


    // Bottom sheet
    sheet: {
        backgroundColor: C.card,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingBottom: 36,
        paddingTop: 14,
        gap: 12,
    },
    sheetHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: C.border,
        alignSelf: "center",
        marginBottom: 8,
    },
    sheetTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: C.text,
        letterSpacing: -0.3,
    },
    sheetSubtitle: {
        fontSize: 13,
        color: C.textSecondary,
        marginBottom: 4,
    },

    // Option rows
    optionBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        paddingVertical: 14,
        paddingHorizontal: 14,
        borderRadius: 14,
        backgroundColor: C.bg,
        borderWidth: 1,
        borderColor: C.border,
    },
    optionIconWrap: {
        width: 42,
        height: 42,
        borderRadius: 12,
        backgroundColor: C.primaryFaded,
        alignItems: "center",
        justifyContent: "center",
    },
    optionTextWrap: {
        flex: 1,
        gap: 2,
    },
    optionLabel: {
        fontSize: 15,
        fontWeight: "600",
        color: C.text,
    },
    optionDesc: {
        fontSize: 12,
        color: C.textSecondary,
    },

    // Cancel
    cancelBtn: {
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: "center",
        backgroundColor: C.bg,
        borderWidth: 1,
        borderColor: C.border,
        marginTop: 4,
    },
    cancelText: {
        fontSize: 15,
        fontWeight: "600",
        color: C.textSecondary,
    },
});


function DateSelector({ label, date, onPress }) {
    return (
        <TouchableOpacity
            style={styles.dateSelector}
            onPress={onPress}
            activeOpacity={0.75}
        >
            <Text style={styles.inputLabel}>{label}</Text>
            <View style={styles.dateValueRow}>
                <Ionicons name="calendar" size={18} color={C.primary} />
                <Text style={styles.dateText}>{date}</Text>
                <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
            </View>
        </TouchableOpacity>
    );
}
const dateStyles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.45)",
        justifyContent: "flex-end",
    },
    sheet: {
        backgroundColor: C.card,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingBottom: 36,
        paddingTop: 14,
        gap: 12,
    },
    sheetHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: C.border,
        alignSelf: "center",
        marginBottom: 8,
    },
    sheetTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: C.text,
        letterSpacing: -0.3,
    },
    confirmBtn: {
        backgroundColor: C.primary,
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: "center",
        marginTop: 8,
    },
    confirmText: {
        fontSize: 15,
        fontWeight: "700",
        color: "#fff",
    },
});



// ─── Main Screen ─────────────────────────────────────────────────────────────

export  default  function NewBookingScreen() {
    const navigation = useNavigation();
    // Client section
    const [clientType, setClientType] = useState("Decorator");
    const [clientName, setClientName] = useState("");
    const [phone, setPhone] = useState("");
    const [address, setAddress] = useState("");//this is the address of decorator in the building ed:f2-72
    // Hook call — destructure renderModals instead of ContactSheet
    const { openContactSheet, renderModals: renderContactModals } = useContactPicker(setClientName, setPhone);

    // Items
    const [items, setItems] = useState([]);
    const [selectedClothTypes, setSelectedClothTypes] = useState([]);
    const [notes,setNotes]=useState(null);

    const {
        toggleClothType,
        renderClothCards,
    } = useClothSelector(selectedClothTypes, setSelectedClothTypes);

    //images
    const [bookingImages, setBookingImages] = useState([]);

    const { renderImageRow, SourceModal } = useImagePicker(bookingImages, setBookingImages);

    // Dates
    const [bookingDate, setBookingDate] = useState(new Date());
    const [returnDate, setReturnDate] = useState(new Date(Date.now() + 86400000));
    console.log("===========returnDate",returnDate);
    const [activePicker, setActivePicker] = useState(null);
    // Format: 29/07/2026
    const formatDate = (date) => {
        const d = String(date.getDate()).padStart(2, "0");
        const m = String(date.getMonth() + 1).padStart(2, "0");
        const y = date.getFullYear();
        return `${d}/${m}/${y}`;
    };

    // Payment
    const [totalAmount, setTotalAmount] = useState();
    const [amountPaid, setAmountPaid] = useState();


    const [isSaving, setIsSaving] = useState(false);


    const handleSaveBooking = async () => {

        if (isSaving) return;

        try {

            setIsSaving(true);


            const result = await createBooking({
                clientType: clientType,
                clientName: clientName,
                phone: phone,
                address: address,

                selectedClothTypes: selectedClothTypes,

                bookingImages: bookingImages,

                bookingDate: bookingDate,
                returnDate: returnDate,
                notes:notes,

                totalAmount: totalAmount,
                amountPaid: amountPaid,
            });


            console.log(
                "Booking saved successfully:",
                result
            );


            
             navigation.goBack();

        } catch (error) {

            console.error(
                "[NewBookingScreen] Failed to save booking:",
                error
            );


            Alert.alert(
                "Could not save booking",
                error.message ||
                "Something went wrong. Please try again."
            );

        } finally {

            setIsSaving(false);
        }
    };


    const remaining = Math.max(
        0,
        (parseInt(totalAmount) || 0) - (parseInt(amountPaid) || 0)
    );

    const addItem = () => setItems((prev) => [...prev, makeItem()]);

    const updateItem = useCallback((id, key, val) => {
        setItems((prev) =>
            prev.map((it) => (it.id === id ? { ...it, [key]: val } : it))
        );
    }, []);

    const removeItem = useCallback((id) => {
        setItems((prev) => prev.filter((it) => it.id !== id));
    }, []);

    const formatRWF = (n) =>
        n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");

    return (
        <KeyboardAvoidingView
            style={{ flex: 1, backgroundColor: C.bg }}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
            <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
            <SourceModal />
            {renderContactModals()}

            {/* ── Date Picker ── */}
            {/* ── Date Picker ── */}
            {activePicker && (
                <DateTimePicker
                    value={activePicker === "booking" ? bookingDate : returnDate}
                    mode="date"
                    display="default"
                    minimumDate={activePicker === "return" ? bookingDate : new Date()}
                    onChange={(event, selectedDate) => {
                        setActivePicker(null); // always close after selection or dismiss

                        if (event.type === "dismissed" || !selectedDate) return;

                        if (activePicker === "booking") {
                            setBookingDate(selectedDate);
                            if (selectedDate > returnDate) setReturnDate(selectedDate);
                        } else {
                            setReturnDate(selectedDate);
                        }
                    }}
                />
            )}

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* ── Section 1: Client ── */}
                <SectionCard>
                    <SectionHeader icon="" title="Client" />
                    <SegmentedControl
                        options={["Decorator", "Client"]}
                        selected={clientType}
                        onSelect={setClientType}
                    />
                    <View style={[styles.inputWrapper, { flexDirection: 'row', flex: 1 }]}>
                        <View style={styles.inputWrapper}>
                            <Text style={styles.inputLabel}>Names</Text>
                            <TextInput
                                style={[styles.textInput, { width: 275 }]}
                                value={clientName}
                                onChangeText={setClientName}
                                placeholder="names..."
                                placeholderTextColor={C.textMuted}
                                cursorColor={C.primary}



                            />
                        </View>

                        <TouchableOpacity style={{ backgroundColor: C.primary, borderRadius: 15, justifyContent: 'center', height: 52, top: 22 }} onPress={openContactSheet}>
                            <Ionicons name="person" size={15} color={"white"} style={{ padding: 20 }} />
                        </TouchableOpacity>
                    </View>
                    <OutlinedInput
                        label="Phone Number"
                        value={phone}
                        onChange={setPhone}
                        keyboardType="phone-pad"
                        placeholder="07XX XXX XXX"
                    />
                    {clientType == "Decorator" ? (
                        <OutlinedInput
                            label="Umuryango"
                            value={address}
                            onChange={setAddress}
                            keyboardType="default"
                            placeholder="f2-7..."
                        />
                    ) : null}

                </SectionCard>

                {/* ── Section 2: Booking Items ── */}
                <SectionCard>
                    <SectionHeader icon="" title="Bookings" />

                    <Dropdown
                        selectedClothTypes={selectedClothTypes}
                        onToggle={toggleClothType}
                    />
                    {renderClothCards()}
                    {renderImageRow()}


                </SectionCard>

                {/* ── Section 3: Dates ── */}
                <SectionCard>
                    <SectionHeader icon="" title="Dates" />
                    <View style={styles.datesRow}>

                        <View style={{ flex: 1 }}>
                            <DateSelector
                                label="Booking Date (today)"
                                date={formatDate(bookingDate)}
                                onPress={() => setActivePicker("booking")}   // ← was () => {}
                            />
                        </View>

                        <View style={styles.dateSeparator}>
                            <View style={styles.dateLine} />
                            <Text style={styles.dateArrow}>→</Text>
                            <View style={styles.dateLine} />
                        </View>

                        <View style={{ flex: 1 }}>
                            <DateSelector
                                label="Return Date"
                                date={formatDate(returnDate)}
                                onPress={() => setActivePicker("return")}    // ← was () => {}
                            />
                        </View>

                    </View>
                </SectionCard>
                  {/* ── Section 5: Notes ── */}
                <SectionCard>
                    <SectionHeader icon="" title="Notes" />

                    <View style={styles.inputWrapper}>
                        <TextInput
                            style={[styles.textInput,{maxHeight:400,minHeight:50}]}
                            value={notes}
                            onChangeText={setNotes}
                            keyboardType="default"
                            placeholderTextColor={C.textMuted}
                            placeholder="notes..."
                            multiline
                            
                        />
                    </View>
                </SectionCard>

                <SectionCard>
                    <SectionHeader icon="" title="Payment" />

                    <View style={styles.inputWrapper}>
                        <Text style={styles.inputLabel}>Total Amount (RWF)</Text>
                        <TextInput
                            style={styles.textInput}
                            value={totalAmount}
                            onChangeText={setTotalAmount}
                            keyboardType="numeric"
                            placeholderTextColor={C.textMuted}
                            placeholder="0"
                        />
                    </View>

                    <View style={styles.inputWrapper}>
                        <Text style={styles.inputLabel}>Amount Paid (RWF)</Text>
                        <TextInput
                            style={styles.textInput}
                            value={amountPaid}
                            onChangeText={setAmountPaid}
                            keyboardType="numeric"
                            placeholderTextColor={C.textMuted}
                            placeholder="0"
                        />
                    </View>

                    <View style={styles.remainingCard}>
                        <View style={styles.remainingLeft}>
                            <Text style={styles.remainingLabel}>Remaining Balance</Text>
                            <Text style={styles.remainingNote}>Auto-calculated</Text>
                        </View>
                        <Text style={styles.remainingAmount}>
                            {formatRWF(remaining)} RWF
                        </Text>
                    </View>
                </SectionCard>

                

                {/* ── Save Button ── */}
                {isSaving ? (
                    <View style={styles.saveBtnDisabled}>
                        <Text style={styles.saveBtnText}>Saving...</Text>
                    </View>
                ) : clientType && clientName && phone && selectedClothTypes.length > 0 && totalAmount ? (
                    <TouchableOpacity style={styles.saveBtn} activeOpacity={0.85} onPress={handleSaveBooking} disabled={isSaving}>
                        <Text style={styles.saveBtnText}>Save Booking</Text>
                    </TouchableOpacity>
                ):(
                    <View style={[styles.saveBtn,styles.saveBtnDisabled]}>
                        <Text style={[styles.saveBtnText,{color: C.textMuted}]}>Save Booking</Text>
                    </View>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    // App Bar
    appBar: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingTop: Platform.OS === "ios" ? 56 : 16,
        paddingBottom: 14,
        backgroundColor: C.bg,
        borderBottomWidth: 1,
        borderBottomColor: C.border,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
    },
    backIcon: {
        fontSize: 22,
        color: C.text,
        fontWeight: "500",
    },
    appBarTitle: {
        fontSize: 17,
        fontWeight: "700",
        color: C.text,
        letterSpacing: -0.3,
    },

    // Scroll
    scrollContent: {
        padding: 16,
        paddingBottom: 24,
        gap: 18,
    },

    // Card
    card: {
        backgroundColor: C.card,
        borderRadius: 18,
        padding: 18,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 3,
        gap: 16,
    },

    // Section header
    sectionHeaderRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 2,
    },
    sectionIcon: { fontSize: 18 },
    sectionTitle: {
        fontSize: 17,
        fontWeight: "700",
        color: C.text,
        letterSpacing: -0.3,
    },

    // Segmented control
    segmented: {
        flexDirection: "row",
        backgroundColor: C.bg,
        borderRadius: 12,
        padding: 3,
        borderWidth: 1,
        borderColor: C.border,
    },
    segment: {
        flex: 1,
        paddingVertical: 9,
        borderRadius: 10,
        alignItems: "center",
    },
    segmentActive: {
        backgroundColor: C.primary,
        shadowColor: C.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
        elevation: 3,
    },
    segmentText: {
        fontSize: 14,
        fontWeight: "600",
        color: C.textSecondary,
    },
    segmentTextActive: {
        color: "#FFFFFF",
    },

    // Input
    inputWrapper: { gap: 7 },
    inputLabel: {
        fontSize: 13,
        fontWeight: "600",
        color: C.textSecondary,
        letterSpacing: 0.1,
    },
    textInput: {
        borderWidth: 1.5,
        borderColor: C.border,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 13,
        fontSize: 15,
        color: C.text,
        backgroundColor: "#FAFAFA",
    },
    textInputFocused: {
        borderColor: C.primary,
        backgroundColor: C.primaryFaded,
    },

    // Contacts button
    contactsBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 11,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: C.primary,
        backgroundColor: C.primaryFaded,
    },
    contactsBtnText: {
        fontSize: 14,
        fontWeight: "600",
        color: C.primary,
    },

    // Dropdown
    dropdown: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        borderWidth: 1.5,
        borderColor: C.border,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 13,
        backgroundColor: "#FAFAFA",
    },
    dropdownText: {
        fontSize: 15,
        color: C.text,
        fontWeight: "500",
    },
    dropdownChevron: {
        fontSize: 11,
        color: C.textSecondary,
    },
    dropdownMenu: {
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 12,
        backgroundColor: C.card,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 5,
    },
    dropdownItem: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 14,
        paddingVertical: 13,
        borderBottomWidth: 1,
        borderBottomColor: C.border,
    },
    dropdownItemActive: {
        backgroundColor: C.primaryFaded,
    },
    dropdownItemText: {
        fontSize: 15,
        color: C.text,
    },
    dropdownItemTextActive: {
        color: C.primary,
        fontWeight: "600",
    },

    // Chips
    chipRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    chip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingHorizontal: 13,
        paddingVertical: 7,
        borderRadius: 99,
        borderWidth: 1.5,
        borderColor: C.border,
        backgroundColor: "#FAFAFA",
    },
    chipActive: {
        borderColor: C.primary,
        backgroundColor: C.primary,
    },
    chipText: {
        fontSize: 13,
        fontWeight: "600",
        color: C.textSecondary,
    },
    chipTextActive: {
        color: "white",
        fontWeight: "bold"
    },
    colorDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    colorDotWhite: {
        borderWidth: 1,
        borderColor: C.border,
    },

    // Quantity
    quantityRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 0,
        alignSelf: "flex-start",
        borderWidth: 1.5,
        borderColor: C.border,
        borderRadius: 12,
        overflow: "hidden",
    },
    qtyBtn: {
        width: 44,
        height: 44,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: C.bg,
    },
    qtyBtnDisabled: {
        opacity: 0.35,
    },
    qtyBtnText: {
        fontSize: 20,
        color: C.primary,
        fontWeight: "600",
        lineHeight: 24,
    },
    qtyValue: {
        width: 44,
        textAlign: "center",
        fontSize: 16,
        fontWeight: "700",
        color: C.text,
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderColor: C.border,
        lineHeight: 44,
    },
    addBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        alignSelf: "flex-start",
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 10,
        borderWidth: 1.5,
        borderStyle: "dashed",
        borderColor: C.primary,
        backgroundColor: C.primaryFaded,
    },
    addBtnText: {
        fontSize: 13,
        fontWeight: "600",
        color: C.primary,
    },

    // Horizontal image scroll
    imageScroll: {
        gap: 10,
        paddingVertical: 4,
        paddingHorizontal: 2,
    },
    imageWrapper: {
        position: "relative",
    },
    image: {
        width: 90,
        height: 90,
        borderRadius: 12,
        backgroundColor: C.border,
    },

    // X remove button
    removeBtn: {
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

    // Modal backdrop
    backdrop: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.45)",
        justifyContent: "flex-end",
    },

    // Bottom sheet
    sheet: {
        backgroundColor: C.card,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingBottom: 36,
        paddingTop: 14,
        gap: 12,
    },
    sheetHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: C.border,
        alignSelf: "center",
        marginBottom: 8,
    },
    sheetTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: C.text,
        letterSpacing: -0.3,
    },
    sheetSubtitle: {
        fontSize: 13,
        color: C.textSecondary,
        marginBottom: 4,
    },

    // Option rows
    optionBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        paddingVertical: 14,
        paddingHorizontal: 14,
        borderRadius: 14,
        backgroundColor: C.bg,
        borderWidth: 1,
        borderColor: C.border,
    },
    optionIconWrap: {
        width: 42,
        height: 42,
        borderRadius: 12,
        backgroundColor: C.primaryFaded,
        alignItems: "center",
        justifyContent: "center",
    },
    optionTextWrap: {
        flex: 1,
        gap: 2,
    },
    optionLabel: {
        fontSize: 15,
        fontWeight: "600",
        color: C.text,
    },
    optionDesc: {
        fontSize: 12,
        color: C.textSecondary,
    },

    // Cancel
    cancelBtn: {
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: "center",
        backgroundColor: C.bg,
        borderWidth: 1,
        borderColor: C.border,
        marginTop: 4,
    },
    cancelText: {
        fontSize: 15,
        fontWeight: "600",
        color: C.textSecondary,
    },

    // Photos
    addPhotoBtn: {
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 10,
        borderWidth: 1.5,
        borderStyle: "dashed",
        borderColor: C.primary,
        alignSelf: "flex-start",
    },
    addPhotoBtnText: {
        fontSize: 13,
        fontWeight: "600",
        color: C.primary,
    },
    photoRow: {
        flexDirection: "row",
        gap: 10,
        marginTop: 4,
    },
    photoPlaceholder: {
        width: 72,
        height: 72,
        borderRadius: 12,
        overflow: "hidden",
        backgroundColor: C.bg,
        borderWidth: 1.5,
        borderColor: C.border,
    },
    photoEmpty: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    photoEmptyIcon: {
        fontSize: 22,
        opacity: 0.3,
    },
    photoImage: {
        width: "100%",
        height: "100%",
        resizeMode: "cover",
    },

    // Item card
    itemCard: { gap: 16 },
    itemDivider: {
        height: 1,
        backgroundColor: C.border,
        marginVertical: 4,
    },
    itemIndex: {
        fontSize: 13,
        fontWeight: "700",
        color: C.textMuted,
        textTransform: "uppercase",
        letterSpacing: 0.8,
        marginBottom: 4,
    },

    // Remove button
    removeBtn: {
        alignSelf: "flex-start",
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 10,
        backgroundColor: C.dangerFaded,
    },
    removeBtnText: {
        fontSize: 13,
        fontWeight: "600",
        color: C.danger,
    },

    // Add item
    addItemBtn: {
        paddingVertical: 13,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: C.primary,
        borderStyle: "dashed",
        alignItems: "center",
        marginTop: 4,
        backgroundColor: C.primaryFaded,
    },
    addItemBtnText: {
        fontSize: 14,
        fontWeight: "700",
        color: C.primary,
    },

    // Dates
    datesRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    dateSeparator: {
        alignItems: "center",
        paddingTop: 14,
        gap: 2,
    },
    dateLine: {
        width: 1,
        height: 8,
        backgroundColor: C.border,
    },
    dateArrow: {
        fontSize: 14,
        color: C.textMuted,
    },
    dateSelector: {
        borderWidth: 1.5,
        borderColor: C.border,
        borderRadius: 12,
        padding: 12,
        backgroundColor: "#FAFAFA",
        gap: 6,
    },
    dateLabelRow: {},
    dateValueRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    dateIcon: { fontSize: 14 },
    dateText: {
        flex: 1,
        fontSize: 14,
        fontWeight: "600",
        color: C.text,
    },
    dateChevron: {
        fontSize: 18,
        color: C.textMuted,
        fontWeight: "300",
    },

    // Remaining card
    remainingCard: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: C.remainingFaded,
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: "#DDD6FE",
    },
    remainingLeft: { gap: 2 },
    remainingLabel: {
        fontSize: 14,
        fontWeight: "600",
        color: C.remaining,
    },
    remainingNote: {
        fontSize: 11,
        color: "#A78BFA",
    },
    remainingAmount: {
        fontSize: 18,
        fontWeight: "800",
        color: C.remaining,
        letterSpacing: -0.5,
    },

    // Save button
    saveBtn: {
        backgroundColor: C.primary,
        borderRadius: 16,
        paddingVertical: 18,
        alignItems: "center",
        alignSelf: "center",
        width: "90%",
        shadowColor: C.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
        elevation: 6,
        marginTop: 4,
    },
    saveBtnDisabled: {
        backgroundColor: C.primaryFaded,

    },
    saveBtnText: {
        fontSize: 16,
        fontWeight: "700",
        color: "#FFFFFF",
        letterSpacing: 0.2,
    },
});