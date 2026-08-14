// components/SingleCheckInCard.jsx
import React from "react";
import { View, Text, Modal, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

const C = {
    primary: "#0F766E",
    primaryFaded: "#F0FDFA",
    bg: "#F8FAFC",
    card: "#FFFFFF",
    text: "#0F172A",
    textSecondary: "#64748B",
    border: "#E2E8F0",
    remaining: "#7C3AED",
    remainingFaded: "#F5F3FF",
};

// Only rendered when exactly one booking qualifies — for that case,
// building the full expandable return/payment UI is more machinery than
// the situation calls for. This just states what's outstanding and hands
// off to the screen that already has every tool: BookingDetailsScreen.
export default function SingleCheckInCard({ item, onDismiss }) {
    const navigation = useNavigation();

    if (!item) return null;

    const reasons = [];
    if (item.returnQualifies) reasons.push(`${item.daysInfo.label} · items not back`);
    if (item.paymentQualifies) reasons.push(`${item.remainingAmountFormatted} RWF still due`);

    return (
        <Modal visible transparent animationType="fade" onRequestClose={onDismiss}>
            <View style={styles.backdrop}>
                <View style={styles.card}>
                    <View style={styles.iconWrap}>
                        <Ionicons name="alert-circle-outline" size={26} color={C.primary} />
                    </View>

                    <Text style={styles.title}>Check in on {item.clientName}?</Text>

                    <View style={styles.reasonsBlock}>
                        {reasons.map((r, i) => (
                            <View key={i} style={styles.reasonRow}>
                                <View style={styles.reasonDot} />
                                <Text style={styles.reasonText}>{r}</Text>
                            </View>
                        ))}
                    </View>

                    <TouchableOpacity
                        style={styles.openBtn}
                        activeOpacity={0.85}
                        onPress={() => {
                            onDismiss();
                            navigation.navigate("Booking Details", { bookingId: item.id });
                        }}
                    >
                        <Text style={styles.openBtnText}>Open Booking</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.dismissBtn} activeOpacity={0.7} onPress={onDismiss}>
                        <Text style={styles.dismissBtnText}>Not now</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.45)",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
    },
    card: {
        width: "100%",
        maxWidth: 360,
        backgroundColor: C.card,
        borderRadius: 20,
        padding: 22,
        alignItems: "center",
        gap: 6,
    },
    iconWrap: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: C.primaryFaded,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 6,
    },
    title: {
        fontSize: 17,
        fontWeight: "700",
        color: C.text,
        textAlign: "center",
        letterSpacing: -0.2,
    },
    reasonsBlock: {
        width: "100%",
        gap: 6,
        marginTop: 6,
        marginBottom: 10,
    },
    reasonRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        backgroundColor: C.bg,
        borderRadius: 10,
        paddingVertical: 8,
        paddingHorizontal: 12,
    },
    reasonDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: C.remaining,
    },
    reasonText: {
        fontSize: 13,
        color: C.textSecondary,
        fontWeight: "600",
        flex: 1,
    },
    openBtn: {
        width: "100%",
        backgroundColor: C.primary,
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: "center",
        marginTop: 4,
    },
    openBtnText: {
        color: "#fff",
        fontSize: 15,
        fontWeight: "700",
    },
    dismissBtn: {
        width: "100%",
        paddingVertical: 12,
        alignItems: "center",
    },
    dismissBtnText: {
        color: C.textSecondary,
        fontSize: 14,
        fontWeight: "600",
    },
});