import React, { useState } from "react";
import {
  View, Text, ScrollView, Pressable, StyleSheet, Platform,
  ActivityIndicator, Alert, TextInput, Modal, Switch,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Colors } from "@/constants/colors";
import {
  useAdminCatalogItems, useAdminCatalogStats, useAdminCatalogCategories,
  useAdminCreateCatalogItem, useAdminUpdateCatalogItem, useAdminArchiveCatalogItem,
  useAdminCreateCatalogCategory, useAdminUpdateCatalogCategory,
} from "@/hooks/useApi";

const STATUS_COLORS: Record<string, string> = {
  active:    Colors.green,
  draft:     Colors.amber,
  inactive:  Colors.textMuted,
  scheduled: Colors.cyan,
  expired:   Colors.crimson,
  archived:  "#555",
};

const RARITY_COLORS: Record<string, string> = {
  common:    "#9E9E9E",
  uncommon:  "#4CAF50",
  rare:      "#2196F3",
  epic:      "#9C27B0",
  legendary: "#F5C842",
};

type CatalogTab = "items" | "categories" | "stats";

const BLANK_ITEM = {
  name: "", description: "", fullDescription: "", cost: "", category: "cosmetic",
  subcategory: "", icon: "gift", rarity: "common", itemType: "cosmetic",
  tags: "", status: "draft", isAvailable: false, isLimited: false, isExclusive: false,
  isPremiumOnly: false, isEquippable: true, isDisplayable: false, isProfileItem: false,
  isWorldItem: false, sellBackValue: "0", sortOrder: "0", featuredOrder: "",
  previewImage: "", slug: "",
};

export default function AdminCatalogScreen() {
  const insets = useSafeAreaInsets();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 84);

  const [tab, setTab] = useState<CatalogTab>("items");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [search, setSearch] = useState("");

  // Create/Edit item modal
  const [itemModal, setItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [form, setForm] = useState<typeof BLANK_ITEM>({ ...BLANK_ITEM });

  // Create category modal
  const [catModal, setCatModal] = useState(false);
  const [catForm, setCatForm] = useState({ slug: "", name: "", icon: "grid-outline", sortOrder: "0" });

  const { data: catalogData, isLoading: itemsLoading, refetch: refetchItems } = useAdminCatalogItems();
  const { data: statsData, isLoading: statsLoading } = useAdminCatalogStats();
  const { data: categoriesData, refetch: refetchCats } = useAdminCatalogCategories();
  const createItem = useAdminCreateCatalogItem();
  const updateItem = useAdminUpdateCatalogItem();
  const archiveItem = useAdminArchiveCatalogItem();
  const createCategory = useAdminCreateCatalogCategory();
  const updateCategory = useAdminUpdateCatalogCategory();

  const allItems: any[] = catalogData?.items ?? [];
  const categories: any[] = categoriesData?.categories ?? [];

  const filteredItems = allItems.filter(i => {
    if (filterStatus !== "all" && i.status !== filterStatus) return false;
    if (filterCategory !== "all" && i.category !== filterCategory) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q) || (i.slug ?? "").includes(q);
    }
    return true;
  });

  function openCreateItem() {
    setEditingItem(null);
    setForm({ ...BLANK_ITEM });
    setItemModal(true);
  }

  function openEditItem(item: any) {
    setEditingItem(item);
    setForm({
      name: item.name ?? "",
      description: item.description ?? "",
      fullDescription: item.fullDescription ?? "",
      cost: String(item.cost ?? ""),
      category: item.category ?? "cosmetic",
      subcategory: item.subcategory ?? "",
      icon: item.icon ?? "gift",
      rarity: item.rarity ?? "common",
      itemType: item.itemType ?? "cosmetic",
      tags: Array.isArray(item.tags) ? item.tags.join(", ") : (item.tags ?? ""),
      status: item.status ?? "draft",
      isAvailable: item.isAvailable ?? false,
      isLimited: item.isLimited ?? false,
      isExclusive: item.isExclusive ?? false,
      isPremiumOnly: item.isPremiumOnly ?? false,
      isEquippable: item.isEquippable ?? true,
      isDisplayable: item.isDisplayable ?? false,
      isProfileItem: item.isProfileItem ?? false,
      isWorldItem: item.isWorldItem ?? false,
      sellBackValue: String(item.sellBackValue ?? "0"),
      sortOrder: String(item.sortOrder ?? "0"),
      featuredOrder: item.featuredOrder != null ? String(item.featuredOrder) : "",
      previewImage: item.previewImage ?? "",
      slug: item.slug ?? "",
    });
    setItemModal(true);
  }

  async function handleSaveItem() {
    const cost = parseInt(form.cost);
    if (!form.name.trim() || isNaN(cost) || cost < 1) {
      Alert.alert("Validation Error", "Name and a valid cost (≥1) are required.");
      return;
    }
    const tags = form.tags.split(",").map(t => t.trim()).filter(Boolean);
    const payload: any = {
      name: form.name.trim(),
      description: form.description.trim(),
      cost,
      category: form.category,
      icon: form.icon.trim() || "gift",
      rarity: form.rarity,
      itemType: form.itemType,
      tags,
      status: form.status,
      isAvailable: form.isAvailable,
      isLimited: form.isLimited,
      isExclusive: form.isExclusive,
      isPremiumOnly: form.isPremiumOnly,
      isEquippable: form.isEquippable,
      isDisplayable: form.isDisplayable,
      isProfileItem: form.isProfileItem,
      isWorldItem: form.isWorldItem,
      sellBackValue: parseInt(form.sellBackValue) || 0,
      sortOrder: parseInt(form.sortOrder) || 0,
      featuredOrder: form.featuredOrder ? parseInt(form.featuredOrder) : null,
    };
    if (form.fullDescription.trim())  payload.fullDescription = form.fullDescription.trim();
    if (form.subcategory.trim())      payload.subcategory = form.subcategory.trim();
    if (form.previewImage.trim())     payload.previewImage = form.previewImage.trim();
    if (form.slug.trim() && !editingItem) payload.slug = form.slug.trim();

    try {
      if (editingItem) {
        await updateItem.mutateAsync({ id: editingItem.id, data: payload });
        Alert.alert("Updated", `${form.name} updated.`);
      } else {
        await createItem.mutateAsync(payload);
        Alert.alert("Created", `${form.name} added to catalog.`);
      }
      setItemModal(false);
      refetchItems();
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Failed to save item.");
    }
  }

  async function handleArchive(item: any) {
    Alert.alert("Archive Product", `Archive "${item.name}"? It will be hidden from the store.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Archive", style: "destructive",
        onPress: async () => {
          try {
            await archiveItem.mutateAsync(item.id);
            refetchItems();
          } catch (err: any) {
            Alert.alert("Error", err.message);
          }
        },
      },
    ]);
  }

  async function handleActivate(item: any) {
    try {
      await updateItem.mutateAsync({ id: item.id, data: { status: "active", isAvailable: true } });
      refetchItems();
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
  }

  async function handleSaveCat() {
    if (!catForm.slug.trim() || !catForm.name.trim()) {
      Alert.alert("Validation Error", "Slug and name are required.");
      return;
    }
    if (!/^[a-z0-9-]+$/.test(catForm.slug)) {
      Alert.alert("Validation Error", "Slug must be lowercase letters, numbers, and hyphens only.");
      return;
    }
    try {
      await createCategory.mutateAsync({
        slug: catForm.slug.trim(),
        name: catForm.name.trim(),
        icon: catForm.icon.trim() || "grid-outline",
        sortOrder: parseInt(catForm.sortOrder) || 0,
      });
      Alert.alert("Created", `Category "${catForm.name}" added.`);
      setCatModal(false);
      setCatForm({ slug: "", name: "", icon: "grid-outline", sortOrder: "0" });
      refetchCats();
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Failed to create category.");
    }
  }

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Catalog Admin</Text>
        <Pressable style={styles.addBtn} onPress={openCreateItem}>
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.addBtnText}>New Item</Text>
        </Pressable>
      </View>

      {/* Tab row */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={styles.tabRow} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
        {(["items", "categories", "stats"] as CatalogTab[]).map(t => (
          <Pressable key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad }]}>

        {/* ─── ITEMS TAB ─── */}
        {tab === "items" && (
          <>
            {/* Search + filters */}
            <View style={styles.searchRow}>
              <Ionicons name="search-outline" size={16} color={Colors.textMuted} style={{ marginRight: 6 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by name, category, slug..."
                placeholderTextColor={Colors.textMuted}
                value={search}
                onChangeText={setSearch}
              />
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 8 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
              {["all", "active", "draft", "inactive", "archived"].map(s => (
                <Pressable key={s}
                  style={[styles.filterChip, filterStatus === s && { backgroundColor: Colors.accent }]}
                  onPress={() => setFilterStatus(s)}>
                  <Text style={[styles.filterChipText, filterStatus === s && { color: "#fff" }]}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={styles.countLabel}>{filteredItems.length} products</Text>

            {itemsLoading ? (
              <ActivityIndicator color={Colors.accent} style={{ marginTop: 40 }} />
            ) : filteredItems.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="cube-outline" size={48} color={Colors.textMuted} />
                <Text style={styles.emptyText}>No items match the filter.</Text>
              </View>
            ) : (
              filteredItems.map((item, i) => {
                const rarityColor = RARITY_COLORS[item.rarity] ?? "#9E9E9E";
                const statusColor = STATUS_COLORS[item.status] ?? Colors.textMuted;
                return (
                  <Animated.View key={item.id} entering={FadeInDown.delay(i * 30).springify()}>
                    <View style={styles.itemCard}>
                      <View style={[styles.itemIcon, { backgroundColor: rarityColor + "18" }]}>
                        <Ionicons name={(item.icon ?? "gift") as any} size={22} color={rarityColor} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={styles.itemNameRow}>
                          <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                          <View style={[styles.statusChip, { backgroundColor: statusColor + "20" }]}>
                            <Text style={[styles.statusChipText, { color: statusColor }]}>
                              {item.status.toUpperCase()}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.itemMeta}>
                          {item.category} · {item.rarity} · {item.cost} coins
                          {item.isPremiumOnly ? " · PREMIUM" : ""}
                          {item.isLimited ? " · LIMITED" : ""}
                        </Text>
                        <Text style={styles.itemSlug} numberOfLines={1}>
                          {item.slug ?? item.id}
                        </Text>
                        <View style={styles.itemFlags}>
                          {item.isEquippable  && <Text style={styles.flag}>equip</Text>}
                          {item.isDisplayable && <Text style={styles.flag}>display</Text>}
                          {item.isWorldItem   && <Text style={styles.flag}>world</Text>}
                          {item.isProfileItem && <Text style={styles.flag}>profile</Text>}
                        </View>
                        <Text style={styles.itemStats}>
                          {item.purchaseCount ?? 0} purchases · {item.equippedCount ?? 0} equipped
                        </Text>
                      </View>
                      <View style={styles.itemActions}>
                        <Pressable style={styles.editBtn} onPress={() => openEditItem(item)}>
                          <Ionicons name="pencil-outline" size={14} color={Colors.accent} />
                        </Pressable>
                        {item.status === "archived" ? (
                          <Pressable style={styles.activateBtn} onPress={() => handleActivate(item)}>
                            <Ionicons name="refresh-outline" size={14} color={Colors.green} />
                          </Pressable>
                        ) : (
                          <Pressable style={styles.archiveBtn} onPress={() => handleArchive(item)}>
                            <Ionicons name="archive-outline" size={14} color={Colors.crimson} />
                          </Pressable>
                        )}
                      </View>
                    </View>
                  </Animated.View>
                );
              })
            )}
          </>
        )}

        {/* ─── CATEGORIES TAB ─── */}
        {tab === "categories" && (
          <>
            <Pressable style={styles.newCatBtn} onPress={() => setCatModal(true)}>
              <Ionicons name="add-circle-outline" size={16} color={Colors.accent} />
              <Text style={styles.newCatBtnText}>Add Category</Text>
            </Pressable>
            {categories.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="list-outline" size={48} color={Colors.textMuted} />
                <Text style={styles.emptyText}>No categories yet.</Text>
              </View>
            ) : (
              categories.map((cat, i) => (
                <Animated.View key={cat.id} entering={FadeInDown.delay(i * 40).springify()}>
                  <View style={styles.catCard}>
                    <View style={styles.catIconBox}>
                      <Ionicons name={(cat.icon ?? "grid-outline") as any} size={18} color={Colors.accent} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.catName}>{cat.name}</Text>
                      <Text style={styles.catMeta}>
                        slug: {cat.slug} · sort: {cat.sortOrder}
                        {cat.parentId ? ` · sub of: ${cat.parentId}` : ""}
                      </Text>
                    </View>
                    <View style={[styles.catActive, { backgroundColor: cat.isActive ? Colors.green + "20" : "#33333380" }]}>
                      <Text style={[styles.catActiveText, { color: cat.isActive ? Colors.green : Colors.textMuted }]}>
                        {cat.isActive ? "ON" : "OFF"}
                      </Text>
                    </View>
                    <Pressable
                      style={styles.editBtn}
                      onPress={() => {
                        Alert.alert("Toggle Category", `${cat.isActive ? "Deactivate" : "Activate"} "${cat.name}"?`, [
                          { text: "Cancel", style: "cancel" },
                          {
                            text: cat.isActive ? "Deactivate" : "Activate",
                            onPress: async () => {
                              try {
                                await updateCategory.mutateAsync({ id: cat.id, data: { isActive: !cat.isActive } });
                                refetchCats();
                              } catch (err: any) { Alert.alert("Error", err.message); }
                            },
                          },
                        ]);
                      }}>
                      <Ionicons name="toggle-outline" size={16} color={Colors.textSecondary} />
                    </Pressable>
                  </View>
                </Animated.View>
              ))
            )}
          </>
        )}

        {/* ─── STATS TAB ─── */}
        {tab === "stats" && (
          <>
            {statsLoading ? (
              <ActivityIndicator color={Colors.accent} style={{ marginTop: 40 }} />
            ) : statsData ? (
              <>
                <View style={styles.statsGrid}>
                  {[
                    { label: "Total Items",    value: String(statsData.itemCount ?? 0),        icon: "cube-outline",    color: Colors.accent },
                    { label: "Active",         value: String(statsData.availableItems ?? 0),   icon: "checkmark-circle-outline", color: Colors.green },
                    { label: "Draft",          value: String(statsData.draftItems ?? 0),        icon: "create-outline",  color: Colors.amber },
                    { label: "Archived",       value: String(statsData.archivedItems ?? 0),     icon: "archive-outline", color: Colors.textMuted },
                    { label: "Limited",        value: String(statsData.limitedItems ?? 0),      icon: "timer-outline",   color: Colors.crimson },
                    { label: "Premium",        value: String(statsData.premiumItems ?? 0),      icon: "diamond-outline", color: Colors.gold },
                    { label: "Purchases",      value: String(statsData.totalPurchases ?? 0),    icon: "bag-handle-outline", color: Colors.cyan },
                    { label: "Coins Spent",    value: (statsData.totalCoinsSpent ?? 0).toLocaleString(), icon: "flash", color: Colors.gold },
                  ].map((s, i) => (
                    <Animated.View key={i} entering={FadeInDown.delay(i * 50).springify()} style={styles.statCard}>
                      <Ionicons name={s.icon as any} size={20} color={s.color} />
                      <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                      <Text style={styles.statLabel}>{s.label}</Text>
                    </Animated.View>
                  ))}
                </View>

                {statsData.categoryBreakdown && (
                  <>
                    <Text style={styles.sectionLabel}>Category Breakdown</Text>
                    {Object.entries(statsData.categoryBreakdown as Record<string, any>).map(([cat, data], i) => (
                      <View key={cat} style={styles.breakdownRow}>
                        <Text style={styles.breakdownCat}>{cat}</Text>
                        <Text style={styles.breakdownStat}>{data.purchases} purchases · {data.coinsSpent.toLocaleString()} coins</Text>
                      </View>
                    ))}
                  </>
                )}
              </>
            ) : null}
          </>
        )}
      </ScrollView>

      {/* ─── CREATE/EDIT ITEM MODAL ─── */}
      <Modal visible={itemModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editingItem ? "Edit Product" : "New Product"}</Text>
            <Pressable onPress={() => setItemModal(false)}>
              <Ionicons name="close" size={24} color={Colors.textPrimary} />
            </Pressable>
          </View>
          <ScrollView style={styles.modalScroll} contentContainerStyle={{ paddingBottom: 60 }}>
            <Field label="Name *" value={form.name} onChangeText={v => setForm(f => ({ ...f, name: v }))} />
            <Field label="Short Description *" value={form.description} multiline onChangeText={v => setForm(f => ({ ...f, description: v }))} />
            <Field label="Full Description" value={form.fullDescription} multiline onChangeText={v => setForm(f => ({ ...f, fullDescription: v }))} />
            <Field label="Cost (coins) *" value={form.cost} keyboardType="numeric" onChangeText={v => setForm(f => ({ ...f, cost: v }))} />
            <Field label="Category" value={form.category} onChangeText={v => setForm(f => ({ ...f, category: v }))} />
            <Field label="Subcategory" value={form.subcategory} onChangeText={v => setForm(f => ({ ...f, subcategory: v }))} />
            <Field label="Icon (Ionicons name)" value={form.icon} onChangeText={v => setForm(f => ({ ...f, icon: v }))} />
            <Field label="Rarity (common|uncommon|rare|epic|legendary)" value={form.rarity} onChangeText={v => setForm(f => ({ ...f, rarity: v }))} />
            <Field label="Item Type" value={form.itemType} onChangeText={v => setForm(f => ({ ...f, itemType: v }))} />
            <Field label="Tags (comma-separated)" value={form.tags} onChangeText={v => setForm(f => ({ ...f, tags: v }))} />
            <Field label="Status (draft|active|inactive|scheduled|archived)" value={form.status} onChangeText={v => setForm(f => ({ ...f, status: v }))} />
            <Field label="Sort Order" value={form.sortOrder} keyboardType="numeric" onChangeText={v => setForm(f => ({ ...f, sortOrder: v }))} />
            <Field label="Featured Order (blank = not featured)" value={form.featuredOrder} keyboardType="numeric" onChangeText={v => setForm(f => ({ ...f, featuredOrder: v }))} />
            <Field label="Sell-Back Value" value={form.sellBackValue} keyboardType="numeric" onChangeText={v => setForm(f => ({ ...f, sellBackValue: v }))} />
            <Field label="Preview Image URL" value={form.previewImage} onChangeText={v => setForm(f => ({ ...f, previewImage: v }))} />
            {!editingItem && <Field label="Slug (optional, auto-generated)" value={form.slug} onChangeText={v => setForm(f => ({ ...f, slug: v }))} />}

            <Text style={styles.togglesLabel}>Flags</Text>
            <Toggle label="Is Available" value={form.isAvailable} onValueChange={v => setForm(f => ({ ...f, isAvailable: v }))} />
            <Toggle label="Is Limited"   value={form.isLimited}   onValueChange={v => setForm(f => ({ ...f, isLimited: v }))} />
            <Toggle label="Is Exclusive" value={form.isExclusive} onValueChange={v => setForm(f => ({ ...f, isExclusive: v }))} />
            <Toggle label="Premium Only" value={form.isPremiumOnly} onValueChange={v => setForm(f => ({ ...f, isPremiumOnly: v }))} />
            <Toggle label="Equippable"   value={form.isEquippable}  onValueChange={v => setForm(f => ({ ...f, isEquippable: v }))} />
            <Toggle label="Displayable"  value={form.isDisplayable} onValueChange={v => setForm(f => ({ ...f, isDisplayable: v }))} />
            <Toggle label="Profile Item" value={form.isProfileItem} onValueChange={v => setForm(f => ({ ...f, isProfileItem: v }))} />
            <Toggle label="World Item"   value={form.isWorldItem}   onValueChange={v => setForm(f => ({ ...f, isWorldItem: v }))} />

            <Pressable
              style={[styles.saveBtn, (createItem.isPending || updateItem.isPending) && { opacity: 0.6 }]}
              onPress={handleSaveItem}
              disabled={createItem.isPending || updateItem.isPending}>
              <Text style={styles.saveBtnText}>{editingItem ? "Save Changes" : "Create Product"}</Text>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>

      {/* ─── CREATE CATEGORY MODAL ─── */}
      <Modal visible={catModal} animationType="slide" presentationStyle="formSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Category</Text>
            <Pressable onPress={() => setCatModal(false)}>
              <Ionicons name="close" size={24} color={Colors.textPrimary} />
            </Pressable>
          </View>
          <ScrollView style={styles.modalScroll}>
            <Field label="Slug (lowercase, hyphens only) *" value={catForm.slug} onChangeText={v => setCatForm(f => ({ ...f, slug: v }))} />
            <Field label="Display Name *" value={catForm.name} onChangeText={v => setCatForm(f => ({ ...f, name: v }))} />
            <Field label="Icon (Ionicons name)" value={catForm.icon} onChangeText={v => setCatForm(f => ({ ...f, icon: v }))} />
            <Field label="Sort Order" value={catForm.sortOrder} keyboardType="numeric" onChangeText={v => setCatForm(f => ({ ...f, sortOrder: v }))} />
            <Pressable style={[styles.saveBtn, createCategory.isPending && { opacity: 0.6 }]}
              onPress={handleSaveCat} disabled={createCategory.isPending}>
              <Text style={styles.saveBtnText}>Create Category</Text>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

function Field({ label, value, onChangeText, multiline, keyboardType }: {
  label: string; value: string; onChangeText: (v: string) => void;
  multiline?: boolean; keyboardType?: any;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.fieldInput, multiline && { height: 72, textAlignVertical: "top" }]}
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor={Colors.textMuted}
        multiline={multiline}
        keyboardType={keyboardType}
        autoCapitalize="none"
      />
    </View>
  );
}

function Toggle({ label, value, onValueChange }: { label: string; value: boolean; onValueChange: (v: boolean) => void }) {
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: "#333", true: Colors.accent + "80" }}
        thumbColor={value ? Colors.accent : "#888"}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: Colors.bg },
  header:        { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 14 },
  title:         { fontSize: 20, fontWeight: "700", color: Colors.textPrimary },
  addBtn:        { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: Colors.accent, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  addBtnText:    { color: "#fff", fontSize: 13, fontWeight: "600" },
  tabRow:        { marginBottom: 4 },
  tab:           { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: Colors.bgElevated },
  tabActive:     { backgroundColor: Colors.accent },
  tabText:       { color: Colors.textMuted, fontSize: 13, fontWeight: "500" },
  tabTextActive: { color: "#fff" },
  scroll:        { paddingHorizontal: 20, paddingTop: 8 },
  searchRow:     { flexDirection: "row", alignItems: "center", backgroundColor: Colors.bgElevated, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 10 },
  searchInput:   { flex: 1, color: Colors.textPrimary, fontSize: 14 },
  filterChip:    { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16, backgroundColor: Colors.bgElevated },
  filterChipText:{ color: Colors.textMuted, fontSize: 12 },
  countLabel:    { color: Colors.textMuted, fontSize: 12, marginBottom: 8 },
  emptyBox:      { alignItems: "center", marginTop: 60, gap: 12 },
  emptyText:     { color: Colors.textMuted, fontSize: 14 },
  itemCard:      { flexDirection: "row", alignItems: "flex-start", backgroundColor: Colors.bgElevated, borderRadius: 12, padding: 12, marginBottom: 10, gap: 10 },
  itemIcon:      { width: 42, height: 42, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  itemNameRow:   { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 3 },
  itemName:      { color: Colors.textPrimary, fontSize: 14, fontWeight: "600", flex: 1 },
  statusChip:    { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  statusChipText:{ fontSize: 10, fontWeight: "700" },
  itemMeta:      { color: Colors.textSecondary, fontSize: 12 },
  itemSlug:      { color: Colors.textMuted, fontSize: 11, marginTop: 2 },
  itemFlags:     { flexDirection: "row", gap: 6, marginTop: 4, flexWrap: "wrap" },
  flag:          { color: Colors.accent, fontSize: 10, backgroundColor: Colors.accent + "15", paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 },
  itemStats:     { color: Colors.textMuted, fontSize: 11, marginTop: 4 },
  itemActions:   { gap: 6 },
  editBtn:       { padding: 6, backgroundColor: Colors.accent + "15", borderRadius: 6 },
  archiveBtn:    { padding: 6, backgroundColor: Colors.crimson + "15", borderRadius: 6 },
  activateBtn:   { padding: 6, backgroundColor: Colors.green + "15", borderRadius: 6 },
  newCatBtn:     { flexDirection: "row", alignItems: "center", gap: 6, padding: 12, backgroundColor: Colors.bgElevated, borderRadius: 10, marginBottom: 12 },
  newCatBtnText: { color: Colors.accent, fontSize: 14, fontWeight: "600" },
  catCard:       { flexDirection: "row", alignItems: "center", backgroundColor: Colors.bgElevated, borderRadius: 10, padding: 12, marginBottom: 8, gap: 10 },
  catIconBox:    { width: 36, height: 36, borderRadius: 8, backgroundColor: Colors.accent + "15", justifyContent: "center", alignItems: "center" },
  catName:       { color: Colors.textPrimary, fontSize: 14, fontWeight: "600" },
  catMeta:       { color: Colors.textMuted, fontSize: 11, marginTop: 2 },
  catActive:     { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, marginRight: 6 },
  catActiveText: { fontSize: 10, fontWeight: "700" },
  statsGrid:     { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
  statCard:      { width: "47%", backgroundColor: Colors.bgElevated, borderRadius: 12, padding: 14, alignItems: "center", gap: 6 },
  statValue:     { fontSize: 22, fontWeight: "700" },
  statLabel:     { color: Colors.textMuted, fontSize: 11, textAlign: "center" },
  sectionLabel:  { color: Colors.textSecondary, fontSize: 13, fontWeight: "600", marginBottom: 8, marginTop: 4 },
  breakdownRow:  { backgroundColor: Colors.bgElevated, borderRadius: 8, padding: 10, marginBottom: 6 },
  breakdownCat:  { color: Colors.textPrimary, fontSize: 13, fontWeight: "600" },
  breakdownStat: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
  modal:         { flex: 1, backgroundColor: Colors.bg },
  modalHeader:   { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle:    { color: Colors.textPrimary, fontSize: 18, fontWeight: "700" },
  modalScroll:   { padding: 20 },
  field:         { marginBottom: 14 },
  fieldLabel:    { color: Colors.textSecondary, fontSize: 12, marginBottom: 4, fontWeight: "500" },
  fieldInput:    { backgroundColor: Colors.bgElevated, borderRadius: 8, padding: 10, color: Colors.textPrimary, fontSize: 14, borderWidth: 1, borderColor: Colors.border },
  togglesLabel:  { color: Colors.textSecondary, fontSize: 13, fontWeight: "600", marginBottom: 8, marginTop: 4 },
  toggleRow:     { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border + "40" },
  toggleLabel:   { color: Colors.textPrimary, fontSize: 14 },
  saveBtn:       { backgroundColor: Colors.accent, borderRadius: 12, padding: 16, alignItems: "center", marginTop: 20 },
  saveBtnText:   { color: "#fff", fontWeight: "700", fontSize: 15 },
});
