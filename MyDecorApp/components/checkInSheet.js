// components/CheckInSheet.jsx
import React, { useState } from "react";
import {
    View,
    Text,
    Modal,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Alert,
    ActivityIndicator,
    StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const C = {
    primary: "#0F766E",
    primaryFaded: "#F0FDFA",
    bg: "#F8FAFC",
    card: "#FFFFFF",
    text: "#0F172A",
    textSecondary: "#64748B",
    textMuted: "#94A3B8",
    border: "#E2E8F0",
    danger: "#EF4444",
    remaining: "#7C3AED",
    remainingFaded: "#F5F3FF",
    success: "#059669",
};

const COLOR_DOT = {
    White: "#FFFFFF",
    Black: "#1E293B",
    Blue: "#3B82F6",
    Gold: "#F59E0B",
    Red: "#EF4444",
};

// Only rendered by BookingsScreen when 2+ bookings qualify — the 1-item
// case uses SingleCheckInCard instead, so this never has to handle "0" or
// "1" as special cases of its own.
export default function CheckInSheet({ items, onDismiss, onResolveReturn, onResolvePayment }) {
    return (
        <Modal visible transparent animationType="slide" onRequestClose={onDismiss}>
            <View style={styles.backdrop}>
                <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onDismiss} />
                <View style={styles.sheet}>
                    <View style={styles.handle} />
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>Isuzuma rya buri munsi</Text>
                        <TouchableOpacity onPress={onDismiss} style={styles.closeBtn} activeOpacity={0.7}>
                            <Ionicons name="close" size={20} color={C.textSecondary} />
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.headerSubtitle}>
                        {items.length} booking{items.length === 1 ? "" : "s"} need a quick update
                    </Text>

                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ gap: 12, paddingBottom: 8 }}
                    >
                        {items.map((item) => (
                            <CheckInItemCard
                                key={item.id}
                                item={item}
                                onResolveReturn={onResolveReturn}
                                onResolvePayment={onResolvePayment}
                            />
                        ))}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

function CheckInItemCard({ item, onResolveReturn, onResolvePayment }) {
    const [returnExpanded, setReturnExpanded] = useState(false);
    const [returnMode, setReturnMode] = useState(null); // null | 'partial'
    const [draftReturn, setDraftReturn] = useState([]);
    const [busyReturn, setBusyReturn] = useState(false);
    const [errorReturn, setErrorReturn] = useState("");

    const [paymentExpanded, setPaymentExpanded] = useState(false);
    const [paymentInput, setPaymentInput] = useState("");
    const [busyPayment, setBusyPayment] = useState(false);
    const [errorPayment, setErrorPayment] = useState("");

    const handleAllReturned = () => {
        Alert.alert("Kwemeza gutarura", "Wemeje ko imyenda yose yafashwe yataruwe?", [
            { text: "Oya", style: "cancel" },
            {
                text: "Yego",
                onPress: async () => {
                    setBusyReturn(true);
                    setErrorReturn("");
                    try {
                        const fullyReturned = item.clothes.map((c) => ({
                            id: c.id,
                            quantity: c.quantity,
                            units: c.units.map((u) => ({ ...u, returned: true })),
                            returnedCount: c.quantity,
                        }));
                        await onResolveReturn(item.id, fullyReturned);
                    } catch (err) {
                        setErrorReturn(err.message);
                    } finally {
                        setBusyReturn(false);
                    }
                },
            },
        ]);
    };

    const openPartial = () => {
        setDraftReturn(
            item.clothes.map((c) => ({
                id: c.id,
                label: c.label,
                quantity: c.quantity,
                units: c.units.map((u) => ({ ...u })),
                returnedCount: c.returnedCount,
            }))
        );
        setReturnMode("partial");
    };

    const toggleDraftUnit = (clothId, unitIndex) => {
        setDraftReturn((prev) =>
            prev.map((c) => {
                if (c.id !== clothId) return c;
                const units = c.units.map((u, i) => (i === unitIndex ? { ...u, returned: !u.returned } : u));
                return { ...c, units, returnedCount: units.filter((u) => u.returned).length };
            })
        );
    };

    const toggleDraftAnonymous = (clothId, unitIndex) => {
        setDraftReturn((prev) =>
            prev.map((c) => {
                if (c.id !== clothId) return c;
                const slots = Array.from({ length: c.quantity }, (_, i) => i < c.returnedCount);
                slots[unitIndex] = !slots[unitIndex];
                return { ...c, returnedCount: slots.filter(Boolean).length };
            })
        );
    };

    const confirmPartial = async () => {
        setBusyReturn(true);
        setErrorReturn("");
        try {
            await onResolveReturn(item.id, draftReturn);
            setReturnMode(null);
        } catch (err) {
            setErrorReturn(err.message);
        } finally {
            setBusyReturn(false);
        }
    };

    // "Amount received now" — NOT a full total/paid editor. That already
    // exists in BookingDetailsScreen; duplicating it here would let a
    // rushed daily check-in accidentally change a booking's total price,
    // which is a bigger action than "record what came in today".
    const markFullyPaid = () => setPaymentInput(String(item.remainingAmount));

    const savePayment = async () => {
        const increment = parseInt(paymentInput) || 0;
        if (increment <= 0) {
            setErrorPayment("Enter an amount greater than 0.");
            return;
        }
        setBusyPayment(true);
        setErrorPayment("");
        try {
            // Overpayment isn't checked here — updateBookingPayment already
            // rejects amountPaid > totalAmount, single source of that rule.
            await onResolvePayment(item.id, {
                totalAmount: item.totalAmount,
                amountPaid: item.amountPaid + increment,
            });
            setPaymentInput("");
        } catch (err) {
            setErrorPayment(err.message);
        } finally {
            setBusyPayment(false);
        }
    };

    return (
        <View style={styles.itemCard}>
            <View style={styles.itemHeader}>
                <View style={styles.itemAvatar}>
                    <Text style={styles.itemAvatarText}>{item.clientName.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.itemName} numberOfLines={1}>{item.clientName}</Text>
                    <Text style={styles.itemSub}>Due {item.returnDateFormatted}</Text>
                </View>
            </View>

            {item.returnQualifies && (
                <View style={styles.section}>
                    <TouchableOpacity
                        style={styles.sectionToggle}
                        onPress={() => setReturnExpanded((v) => !v)}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="shirt-outline" size={16} color={C.textSecondary} />
                        <Text style={styles.sectionToggleText}>{item.daysInfo.label} · Hari ibitarataruwe</Text>
                        <Ionicons name={returnExpanded ? "chevron-up" : "chevron-down"} size={16} color={C.textMuted} />
                    </TouchableOpacity>

                    {returnExpanded && (
                        returnMode === "partial" ? (
                            <View style={styles.checklistBlock}>
                                {draftReturn.map((cloth) => (
                                    <View key={cloth.id} style={{ gap: 6, marginBottom: 8 }}>
                                        <Text style={styles.checklistClothLabel}>{cloth.label}</Text>
                                        {cloth.units.length > 0
                                            ? cloth.units.map((u, ui) => (
                                                <TouchableOpacity
                                                    key={ui}
                                                    style={styles.checkRow}
                                                    onPress={() => toggleDraftUnit(cloth.id, ui)}
                                                    activeOpacity={0.7}
                                                >
                                                    <View style={[styles.checkbox, u.returned && styles.checkboxChecked]}>
                                                        {u.returned && <Ionicons name="checkmark" size={12} color="#fff" />}
                                                    </View>
                                                    {u.color && (
                                                        <View style={[
                                                            styles.colorDot,
                                                            { backgroundColor: COLOR_DOT[u.color] ?? "#ccc" },
                                                        ]} />
                                                    )}
                                                    <Text style={styles.checkText}>
                                                        {[u.color, u.size].filter(Boolean).join(" · ") || `Unit ${ui + 1}`}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))
                                            : Array.from({ length: cloth.quantity }, (_, i) => {
                                                const done = i < cloth.returnedCount;
                                                return (
                                                    <TouchableOpacity
                                                        key={i}
                                                        style={styles.checkRow}
                                                        onPress={() => toggleDraftAnonymous(cloth.id, i)}
                                                        activeOpacity={0.7}
                                                    >
                                                        <View style={[styles.checkbox, done && styles.checkboxChecked]}>
                                                            {done && <Ionicons name="checkmark" size={12} color="#fff" />}
                                                        </View>
                                                        <Text style={styles.checkText}>Unit {i + 1}</Text>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                    </View>
                                ))}
                                {errorReturn !== "" && <Text style={styles.errorText}>{errorReturn}</Text>}
                                <TouchableOpacity
                                    style={[styles.confirmBtn, busyReturn && { opacity: 0.6 }]}
                                    disabled={busyReturn}
                                    onPress={confirmPartial}
                                    activeOpacity={0.85}
                                >
                                    {busyReturn
                                        ? <ActivityIndicator size="small" color="#fff" />
                                        : <Ionicons name="checkmark" size={15} color="#fff" />}
                                    <Text style={styles.confirmBtnText}>{busyReturn ? "Saving…" : "Confirm Returns"}</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View style={styles.returnBtnsRow}>
                                <TouchableOpacity
                                    style={[styles.allReturnBtn, busyReturn && { opacity: 0.6 }]}
                                    disabled={busyReturn}
                                    onPress={handleAllReturned}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.allReturnBtnText}>Yose yataruwe</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.someReturnBtn}
                                    onPress={openPartial}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.someReturnBtnText}>Imyenda yataruwe</Text>
                                </TouchableOpacity>
                            </View>
                        )
                    )}
                    {returnMode !== "partial" && errorReturn !== "" && (
                        <Text style={styles.errorText}>{errorReturn}</Text>
                    )}
                </View>
            )}

            {item.paymentQualifies && (
                <View style={styles.section}>
                    <TouchableOpacity
                        style={styles.sectionToggle}
                        onPress={() => setPaymentExpanded((v) => !v)}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="cash-outline" size={16} color={C.remaining} />
                        <Text style={[styles.sectionToggleText, { color: C.remaining }]}>
                            {item.remainingAmountFormatted} RWF due
                        </Text>
                        <Ionicons name={paymentExpanded ? "chevron-up" : "chevron-down"} size={16} color={C.textMuted} />
                    </TouchableOpacity>

                    {paymentExpanded && (
                        <View style={styles.paymentBlock}>
                            <TextInput
                                style={styles.paymentInput}
                                value={paymentInput}
                                onChangeText={(v) => { setPaymentInput(v); setErrorPayment(""); }}
                                keyboardType="numeric"
                                placeholder="Amount received now"
                                placeholderTextColor={C.textMuted}
                                cursorColor={C.remaining}
                                editable={!busyPayment}
                            />
                            <TouchableOpacity style={styles.fullyPaidBtn} onPress={markFullyPaid} activeOpacity={0.7}>
                                <Text style={styles.fullyPaidBtnText}>
                                    Mark fully paid ({item.remainingAmountFormatted} RWF)
                                </Text>
                            </TouchableOpacity>
                            {errorPayment !== "" && <Text style={styles.errorText}>{errorPayment}</Text>}
                            <TouchableOpacity
                                style={[styles.confirmBtn, { backgroundColor: C.remaining }, busyPayment && { opacity: 0.6 }]}
                                disabled={busyPayment}
                                onPress={savePayment}
                                activeOpacity={0.85}
                            >
                                {busyPayment
                                    ? <ActivityIndicator size="small" color="#fff" />
                                    : <Ionicons name="checkmark" size={15} color="#fff" />}
                                <Text style={styles.confirmBtnText}>{busyPayment ? "Saving…" : "Save Payment"}</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.45)",
        justifyContent: "flex-end",
    },
    sheet: {
        backgroundColor: C.bg,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingTop: 14,
        paddingBottom: 36,
        maxHeight: "85%",
        gap: 10,
    },
    handle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: C.border,
        alignSelf: "center",
        marginBottom: 4,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: C.text,
        letterSpacing: -0.3,
    },
    closeBtn: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: C.card,
        alignItems: "center",
        justifyContent: "center",
    },
    headerSubtitle: {
        fontSize: 13,
        color: C.textSecondary,
        marginBottom: 4,
    },

    itemCard: {
        backgroundColor: C.card,
        borderRadius: 16,
        padding: 14,
        gap: 10,
        borderWidth: 1,
        borderColor: C.border,
    },
    itemHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    itemAvatar: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: C.primaryFaded,
        alignItems: "center",
        justifyContent: "center",
    },
    itemAvatarText: {
        fontSize: 15,
        fontWeight: "700",
        color: C.primary,
    },
    itemName: {
        fontSize: 15,
        fontWeight: "700",
        color: C.text,
    },
    itemSub: {
        fontSize: 12,
        color: C.textMuted,
        marginTop: 1,
    },

    section: {
        backgroundColor: C.bg,
        borderRadius: 12,
        padding: 4,
    },
    sectionToggle: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingVertical: 8,
        paddingHorizontal: 8,
    },
    sectionToggleText: {
        flex: 1,
        fontSize: 13,
        fontWeight: "600",
        color: C.textSecondary,
    },

    returnBtnsRow: {
        flexDirection: "row",
        gap: 8,
        padding: 8,
        paddingTop: 0,
    },
    allReturnBtn: {
        flex: 1,
        alignItems: "center",
        paddingVertical: 11,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: C.primary,
        backgroundColor: C.primaryFaded,
    },
    allReturnBtnText: {
        fontSize: 12,
        fontWeight: "700",
        color: C.primary,
    },
    someReturnBtn: {
        flex: 1,
        alignItems: "center",
        paddingVertical: 11,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: C.border,
        backgroundColor: C.card,
    },
    someReturnBtnText: {
        fontSize: 12,
        fontWeight: "700",
        color: C.textSecondary,
    },

    checklistBlock: {
        padding: 8,
        paddingTop: 0,
    },
    checklistClothLabel: {
        fontSize: 13,
        fontWeight: "700",
        color: C.text,
    },
    checkRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingVertical: 6,
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 6,
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
    colorDot: {
        width: 9,
        height: 9,
        borderRadius: 5,
    },
    checkText: {
        fontSize: 13,
        color: C.text,
    },

    paymentBlock: {
        padding: 8,
        paddingTop: 0,
        gap: 8,
    },
    paymentInput: {
        borderWidth: 1.5,
        borderColor: C.remaining,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
        fontWeight: "600",
        color: C.text,
        backgroundColor: C.remainingFaded,
    },
    fullyPaidBtn: {
        alignSelf: "flex-start",
    },
    fullyPaidBtnText: {
        fontSize: 12,
        fontWeight: "700",
        color: C.remaining,
    },

    confirmBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        backgroundColor: C.primary,
        borderRadius: 10,
        paddingVertical: 11,
        marginTop: 4,
    },
    confirmBtnText: {
        fontSize: 13,
        fontWeight: "700",
        color: "#fff",
    },
    errorText: {
        fontSize: 12,
        color: C.danger,
        paddingHorizontal: 8,
        paddingTop: 2,
    },
});