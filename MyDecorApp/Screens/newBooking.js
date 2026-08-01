import React, { useState, useCallback } from "react";
import {
    View,
    Text,
    ScrollView,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    StatusBar,
    Image,
    Platform,
    KeyboardAvoidingView,
} from "react-native";
import Ionicons from '@expo/vector-icons/Ionicons';

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

const CLOTH_TYPES = [
    "Princess Gown",
    "Black Suit",
    "Imikenyero",
    "Bridesmaid Dress",
    "Shoes",
    "Accessories",
];
const COLORS = ["White", "Black", "Blue", "Gold", "Red"];
const SIZES = ["XS", "S", "M", "L", "XL"];

const COLOR_DOT = {
    White: "#FFFFFF",
    Black: "#1E293B",
    Blue: "#3B82F6",
    Gold: "#F59E0B",
    Red: "#EF4444",
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

function Dropdown({ label, options, selected, onSelect }) {
    const [open, setOpen] = useState(false);
    return (
        <View style={styles.inputWrapper}>
            {label ? <Text style={styles.inputLabel}>{label}</Text> : null}
            <TouchableOpacity
                style={styles.dropdown}
                onPress={() => setOpen((p) => !p)}
                activeOpacity={0.75}
            >
                <Text style={styles.dropdownText}>{selected}</Text>
                <Text style={styles.dropdownChevron}>{open ? "▲" : "▼"}</Text>
            </TouchableOpacity>
            {open && (
                <View style={styles.dropdownMenu}>
                    {options.map((opt) => (
                        <TouchableOpacity
                            key={opt}
                            style={[styles.dropdownItem, opt === selected && styles.dropdownItemActive]}
                            onPress={() => { onSelect(opt); setOpen(false); }}
                            activeOpacity={0.7}
                        >
                            <Text
                                style={[styles.dropdownItemText, opt === selected && styles.dropdownItemTextActive]}
                            >
                                {opt}
                            </Text>
                            {opt === selected && <Text style={{ color: C.primary }}>✓</Text>}
                        </TouchableOpacity>
                    ))}
                </View>
            )}
        </View>
    );
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
                onPress={() => value > 1 && onChange(value - 1)}
                activeOpacity={0.7}
            >
                <Text style={styles.qtyBtnText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.qtyValue}>{value}</Text>
            <TouchableOpacity
                style={styles.qtyBtn}
                onPress={() => onChange(value + 1)}
                activeOpacity={0.7}
            >
                <Text style={styles.qtyBtnText}>+</Text>
            </TouchableOpacity>
        </View>
    );
}

function PhotoRow({ photos }) {
    return (
        <View style={styles.photoRow}>
            {photos.map((photo, i) => (
                <TouchableOpacity key={i} style={styles.photoPlaceholder} activeOpacity={0.75}>
                    {photo ? (
                        <Image source={{ uri: photo }} style={styles.photoImage} />
                    ) : (
                        <View style={styles.photoEmpty}>
                            <Text style={styles.photoEmptyIcon}>📷</Text>
                        </View>
                    )}
                </TouchableOpacity>
            ))}
        </View>
    );
}

function DateSelector({ label, date, onPress }) {
    return (
        <TouchableOpacity style={styles.dateSelector} onPress={onPress} activeOpacity={0.75}>
            <View style={styles.dateLabelRow}>
                <Text style={styles.inputLabel}>{label}</Text>
            </View>
            <View style={styles.dateValueRow}>
                <Text style={styles.dateIcon}>📅</Text>
                <Text style={styles.dateText}>{date}</Text>
                <Text style={styles.dateChevron}>›</Text>
            </View>
        </TouchableOpacity>
    );
}

function ItemCard({ item, onUpdate, onRemove, canRemove }) {
    const update = useCallback(
        (key, val) => onUpdate(item.id, key, val),
        [item.id, onUpdate]
    );

    return (
        <View style={styles.itemCard}>
            {/* Cloth Type */}
            <Dropdown
                label="Cloth Type"
                options={CLOTH_TYPES}
                selected={item.clothType}
                onSelect={(v) => update("clothType", v)}
            />

            {/* Color */}
            <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Color</Text>
                <ChipGroup
                    options={COLORS}
                    selected={item.color}
                    onSelect={(v) => update("color", v)}
                    colorMode
                />
            </View>

            {/* Size */}
            <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Size</Text>
                <ChipGroup
                    options={SIZES}
                    selected={item.size}
                    onSelect={(v) => update("size", v)}
                />
            </View>

            {/* Quantity */}
            <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Quantity</Text>
                <QuantitySelector
                    value={item.quantity}
                    onChange={(v) => update("quantity", v)}
                />
            </View>

            {/* Photos */}
            <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Photos</Text>
                <TouchableOpacity style={styles.addPhotoBtn} activeOpacity={0.7}>
                    <Text style={styles.addPhotoBtnText}>+ Add Photos</Text>
                </TouchableOpacity>
                <PhotoRow photos={item.photos} />
            </View>

            {/* Remove */}
            {canRemove && (
                <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={() => onRemove(item.id)}
                    activeOpacity={0.7}
                >
                    <Text style={styles.removeBtnText}>🗑 Remove Item</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function NewBookingScreen() {
    // Client section
    const [clientType, setClientType] = useState("Client");
    const [clientName, setClientName] = useState("");
    const [phone, setPhone] = useState("");

    // Items
    const [items, setItems] = useState([makeItem()]);

    // Dates
    const [bookingDate, setBookingDate] = useState("29 Jul 2026");
    const [returnDate, setReturnDate] = useState("2 Aug 2026");

    // Payment
    const [totalAmount, setTotalAmount] = useState("150000");
    const [amountPaid, setAmountPaid] = useState("50000");

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
                                style={[styles.textInput, focused && styles.textInputFocused]}
                                value={clientName}
                                onChangeText={setClientName}
                                placeholder="names..."
                                placeholderTextColor={C.textMuted}
                                keyboardType={keyboardType}
                                
                            />
                        </View>

                        <TouchableOpacity style={{ backgroundColor: C.primary, borderRadius: 15 }}>
                            <Ionicons name="person" size={20} color={"white"} style={{ padding: 20, alignSelf: 'center' }} />
                        </TouchableOpacity>
                    </View>
                    <OutlinedInput
                        label="Phone Number"
                        value={phone}
                        onChange={setPhone}
                        keyboardType="phone-pad"
                        placeholder="07XX XXX XXX"
                    />

                </SectionCard>

                {/* ── Section 2: Booking Items ── */}
                <SectionCard>
                    <SectionHeader icon="" title="Booking Items" />

                    {items.map((item, index) => (
                        <View key={item.id}>
                            {index > 0 && <View style={styles.itemDivider} />}
                            {items.length > 1 && (
                                <Text style={styles.itemIndex}>Item {index + 1}</Text>
                            )}
                            <ItemCard
                                item={item}
                                onUpdate={updateItem}
                                onRemove={removeItem}
                                canRemove={items.length > 1}
                            />
                        </View>
                    ))}

                    <TouchableOpacity style={styles.addItemBtn} onPress={addItem} activeOpacity={0.7}>
                        <Text style={styles.addItemBtnText}>+ Add Another Item</Text>
                    </TouchableOpacity>
                </SectionCard>

                {/* ── Section 3: Dates ── */}
                <SectionCard>
                    <SectionHeader icon="" title="Dates" />
                    <View style={styles.datesRow}>
                        <View style={{ flex: 1 }}>
                            <DateSelector
                                label="Booking Date"
                                date={bookingDate}
                                onPress={() => { }}
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
                                date={returnDate}
                                onPress={() => { }}
                            />
                        </View>
                    </View>
                </SectionCard>

                {/* ── Section 4: Payment ── */}
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
                <TouchableOpacity style={styles.saveBtn} activeOpacity={0.85}>
                    <Text style={styles.saveBtnText}>Save Booking</Text>
                </TouchableOpacity>

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
        backgroundColor: C.primaryFaded,
    },
    chipText: {
        fontSize: 13,
        fontWeight: "600",
        color: C.textSecondary,
    },
    chipTextActive: {
        color: C.primary,
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
    saveBtnText: {
        fontSize: 16,
        fontWeight: "700",
        color: "#FFFFFF",
        letterSpacing: 0.2,
    },
});