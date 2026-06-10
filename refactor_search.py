import re

with open("public/warships/js/components.js", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Replace the entire top section of AddModDialog template
template_old = """
            <q-card-section class="q-pt-none q-gutter-md">
                <!-- Search Bar -->
                <div class="q-mb-md row items-center">
                    <div class="col-grow">
                        <q-select
                            filled dark
                            v-model="searchSelection"
                            use-input
                            input-debounce="300"
                            :label="$t('ui.search_component')"
                            :options="searchOptions"
                            option-label="label"
                            option-value="id"
                            @filter="filterSearch"
                            @update:model-value="onSearchSelect"
                            clearable
                            dense
                        >
                            <template v-slot:prepend><q-icon name="search" /></template>
                        </q-select>
                    </div>
                    <div class="col-auto q-pl-sm">
                        <q-btn flat round dense icon="info" size="sm" color="grey-5">
                            <q-tooltip>{{ $t('ui.search_help') }}</q-tooltip>
                        </q-btn>
                    </div>
                </div>
                <q-separator dark class="q-mb-md" />

                <!-- Form Elements -->
                <div class="row q-col-gutter-sm q-mb-md">
                    <div class="col-12 col-md-4">
                        <q-select filled dark v-model="newComponentCategory" :options="categoryOptions" :label="$t('ui.category')" emit-value map-options clearable @update:model-value="resetSelections" stack-label>
                            <template v-slot:prepend><q-icon name="folder" /></template>
                        </q-select>
                    </div>
                    <div class="col-12 col-md-4">
                        <q-select filled dark v-model="newComponentGroup" :options="groupOptions" :label="$t('ui.sys_type')" emit-value map-options clearable :disable="!newComponentCategory || !groupOptions.length" @update:model-value="newComponentSelection = null" stack-label>
                            <template v-slot:prepend><q-icon name="category" /></template>
                        </q-select>
                    </div>
                    <div class="col-12 col-md-4">
                        <q-select filled dark v-model="newComponentPL" :options="plOptions" label="Progress Level" emit-value map-options clearable :disable="!plOptions.length" @update:model-value="newComponentSelection = null" stack-label>
                            <template v-slot:prepend><q-icon name="science" /></template>
                        </q-select>
                    </div>
                </div>

                <div class="q-mb-md">
                    <q-select
                        filled dark
                        v-model="newComponentSelection"
                        :options="itemOptions"
"""

template_new = """
            <q-card-section class="q-pt-none q-gutter-md">
                <!-- Smart Search Bar -->
                <div class="q-mb-md row items-center">
                    <div class="col-grow">
                        <q-select
                            filled dark
                            v-model="searchTags"
                            use-input
                            use-chips
                            multiple
                            hide-dropdown-icon
                            input-debounce="0"
                            new-value-mode="add-unique"
                            :label="$t('ui.search_component')"
                            hint="Filter by Category, Type, PL, or search by name"
                            :options="searchTagOptions"
                            @filter="filterSearchTags"
                            @update:model-value="newComponentSelection = null"
                            clearable
                        >
                            <template v-slot:prepend><q-icon name="search" /></template>
                        </q-select>
                    </div>
                </div>

                <div class="q-mb-md">
                    <q-select
                        filled dark
                        v-model="newComponentSelection"
                        :options="itemOptions"
"""

content = content.replace(template_old.strip(), template_new.strip())

# 2. Replace the setup state variables and computed logic
state_old = """
        // 1. State
        const newComponentCategory = ref(null);
        const newComponentGroup = ref(null);
        const newComponentPL = ref(null);
        const newComponentSelection = ref(null);
        
        const resetSelections = () => {
            newComponentGroup.value = null;
            newComponentPL.value = null;
            newComponentSelection.value = null;
        };

        const searchSelection = ref(null);
        const searchOptions = ref([]);
        const filterSearch = (val, update) => {
            if (val === '') {
                update(() => { searchOptions.value = [] });
                return;
            }
            update(() => {
                const needle = val.toLowerCase();
                searchOptions.value = store.allEquipment
                    .filter(e => getLocalizedName(e).toLowerCase().includes(needle))
                    .map(e => ({ label: getLocalizedName(e), id: e.id }));
            });
        };
        const onSearchSelect = (val) => {
            if (val) {
                newComponentSelection.value = val;
            }
            searchSelection.value = null; // Reset search
        };

        // 2. Menu Options Logic (Computed)
        // Computes available categories based on all equipment
        // Helper to filter all equipment based on active filters
        const filteredEquipmentPool = computed(() => {
            return store.allEquipment.filter(e => {
                if (newComponentCategory.value && e.category !== newComponentCategory.value) return false;
                if (newComponentGroup.value && e.group !== newComponentGroup.value) return false;
                if (newComponentPL.value && e.stats?.pl !== newComponentPL.value) return false;
                return true;
            });
        });

        const categoryOptions = computed(() => {
            const categories = [...new Set(store.allEquipment.map(e => e.category).filter(c => c))];
            return categories.map(c => {
                const key = `category.${c.toLowerCase().replace(/ /g, '_')}`;
                const label = t(key);
                return { label: label !== key ? label : c, value: c };
            }).sort((a, b) => a.label.localeCompare(b.label));
        });

        // Computes available groups based on Category and PL filters
        const groupOptions = computed(() => {
            if (!newComponentCategory.value) return [];
            let pool = store.allEquipment.filter(e => e.category === newComponentCategory.value);
            if (newComponentPL.value) pool = pool.filter(e => e.stats?.pl === newComponentPL.value);
            
            const groups = [...new Set(pool.map(e => e.group).filter(g => g))];
            return groups.map(g => ({ label: g, value: g })).sort((a, b) => a.label.localeCompare(b.label));
        });

        // Computes available PLs based on Category and Group filters
        const plOptions = computed(() => {
            let pool = store.allEquipment;
            if (newComponentCategory.value) pool = pool.filter(e => e.category === newComponentCategory.value);
            if (newComponentGroup.value) pool = pool.filter(e => e.group === newComponentGroup.value);
            
            const pls = [...new Set(pool.map(e => e.stats?.pl).filter(p => p))];
            return pls.map(p => ({ label: p, value: p })).sort();
        });

        const itemOptions = computed(() => {
            return filteredEquipmentPool.value
"""

state_new = """
        // 1. State
        const searchTags = ref([]);
        const newComponentSelection = ref(null);
        const searchTagOptions = ref([]);

        const resetSelections = () => {
            searchTags.value = [];
            newComponentSelection.value = null;
        };

        const allAvailableTags = computed(() => {
            const tags = new Set();
            for (const e of store.allEquipment) {
                if (e.category) tags.add(`Category: ${e.category}`);
                if (e.group) tags.add(`Type: ${e.group}`);
                if (e.stats?.pl) tags.add(`PL: ${e.stats.pl}`);
            }
            return Array.from(tags).sort();
        });

        const filterSearchTags = (val, update) => {
            if (val === '') {
                update(() => {
                    searchTagOptions.value = allAvailableTags.value;
                });
                return;
            }
            update(() => {
                const needle = val.toLowerCase();
                searchTagOptions.value = allAvailableTags.value.filter(v => v.toLowerCase().includes(needle));
            });
        };

        // Helper to filter all equipment based on active tags
        const filteredEquipmentPool = computed(() => {
            return store.allEquipment.filter(e => {
                if (!searchTags.value.length) return true;
                
                for (const tag of searchTags.value) {
                    if (tag.startsWith("Category: ")) {
                        const val = tag.replace("Category: ", "");
                        if (e.category !== val) return false;
                    } else if (tag.startsWith("Type: ")) {
                        const val = tag.replace("Type: ", "");
                        if (e.group !== val) return false;
                    } else if (tag.startsWith("PL: ")) {
                        const val = tag.replace("PL: ", "");
                        if (e.stats?.pl !== val) return false;
                    } else {
                        // Freeform text search
                        const needle = tag.toLowerCase();
                        const nameMatch = getLocalizedName(e).toLowerCase().includes(needle);
                        const descMatch = e.description && e.description.toLowerCase().includes(needle);
                        if (!nameMatch && !descMatch) return false;
                    }
                }
                return true;
            });
        });

        const itemOptions = computed(() => {
            return filteredEquipmentPool.value
"""

content = content.replace(state_old.strip(), state_new.strip())

# 3. Replace the return statement
return_old = """
        return { store, newComponentCategory, newComponentGroup, newComponentPL, newComponentSelection, categoryOptions, groupOptions, plOptions, itemOptions, selectedItemDef, isSizeValid, checkRequirements, previewCost, previewHullPts, resetSelections, formatCreds, installComponent, getLocalizedName, searchSelection, searchOptions, filterSearch, onSearchSelect,
            showJsonEditor, jsonContent, openWiki, openJsonEditor, saveJson, createNew, deleteComponent
        };
"""

return_new = """
        return { store, searchTags, searchTagOptions, filterSearchTags, newComponentSelection, itemOptions, selectedItemDef, isSizeValid, checkRequirements, previewCost, previewHullPts, resetSelections, formatCreds, installComponent, getLocalizedName,
            showJsonEditor, jsonContent, openWiki, openJsonEditor, saveJson, createNew, deleteComponent
        };
"""

content = content.replace(return_old.strip(), return_new.strip())

with open("public/warships/js/components.js", "w", encoding="utf-8") as f:
    f.write(content)

print("Refactored components.js")
