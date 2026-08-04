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
    clientName: "Kalisa Jean Piere",
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

    const remaining = booking.totalAmount - booking.amountPaid;
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

Total:     ${formatRWF(booking.totalAmount)} RWF
Paid:      ${formatRWF(booking.amountPaid)} RWF
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
                        onPress={() => navigation?.navigate("New Booking", { booking })}
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
                        <View style={{ flex: 1, gap: 5 }}>
                            <Text style={detailStyles.clientFullName}>{booking.clientName}</Text>
                            <View style={detailStyles.clientPhoneRow}>
                                <Ionicons name="call-outline" size={14} color={C.textSecondary} />
                                <Text style={detailStyles.clientPhone}>{booking.clientPhone}</Text>
                            </View>
                            <View style={detailStyles.typePill}>
                                <Text style={detailStyles.typePillText}>{booking.clientType}</Text>
                            </View>
                        </View>
                    </View>
                </SectionCard>

                {/* ── Booked Items ── */}
                <SectionCard>
                    <SectionHeader icon="" title="Bookings" badge={booking.clothes.length} />

                    {booking.clothes.map((cloth, ci) => (
                        <View
                            key={cloth.id}
                            style={[
                                detailStyles.clothRow,
                                ci < booking.clothes.length - 1 && detailStyles.clothRowBorder,
                            ]}
                        >
                            <View style={detailStyles.clothTopRow}>
                                <Text style={detailStyles.clothLabel}>{cloth.label}</Text>
                                <View style={detailStyles.qtyBadge}>
                                    <Text style={detailStyles.qtyBadgeText}>x{cloth.quantity}</Text>
                                </View>
                            </View>

                            {cloth.units.length > 0 && (
                                <View style={detailStyles.unitsWrap}>
                                    {cloth.units.map((unit, ui) => (
                                        <View key={ui} style={detailStyles.unitChip}>
                                            {unit.color && <ColorDot color={unit.color} />}
                                            <Text style={detailStyles.unitChipText}>
                                                {[unit.color, unit.size].filter(Boolean).join(" · ")}
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            )}
                        </View>
                    ))}
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
                </SectionCard>

                {/* ── Payment ── */}
                <SectionCard>
                    <SectionHeader icon="" title="Payment" />
                    <InfoRow
                        label="Total Amount"
                        value={`${formatRWF(booking.totalAmount)} RWF`}
                        valueStyle={detailStyles.paymentTotal}
                    />
                    <View style={detailStyles.paymentDivider} />
                    <InfoRow
                        label="Amount Paid"
                        value={`${formatRWF(booking.amountPaid)} RWF`}
                        valueStyle={{ color: C.success, fontWeight: "600" }}
                    />
                    <View style={detailStyles.remainingBlock}>
                        <View>
                            <Text style={detailStyles.remainingLabel}>Remaining Balance</Text>
                            <Text style={detailStyles.remainingNote}>Auto-calculated</Text>
                        </View>
                        <Text style={detailStyles.remainingAmount}>
                            {formatRWF(remaining)} RWF
                        </Text>
                    </View>
                </SectionCard>

                {/* ── Action buttons ── */}
                <View style={detailStyles.actionsSection}>
                    <TouchableOpacity
                        style={detailStyles.editBtn}
                        onPress={() => navigation?.navigate("New Booking", { booking })}
                        activeOpacity={0.85}
                    >
                        <Ionicons name="create-outline" size={19} color="#fff" />
                        <Text style={detailStyles.editBtnText}>Edit Booking</Text>
                    </TouchableOpacity>

                    <View style={detailStyles.secondaryRow}>
                        <TouchableOpacity
                            style={detailStyles.shareBtn}
                            onPress={handleShare}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="share-outline" size={18} color={C.primary} />
                            <Text style={detailStyles.shareBtnText}>Share</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={detailStyles.deleteBtn}
                            onPress={handleDelete}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="trash-outline" size={18} color={C.danger} />
                            <Text style={detailStyles.deleteBtnText}>Delete</Text>
                        </TouchableOpacity>
                    </View>
                </View>

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
});