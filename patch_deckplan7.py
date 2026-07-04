import os

with open("/home/dimble/WebstormProjects/starship-architect/public/warships/js/deckplan.js", "r") as f:
    content = f.read()

# 1. Fix the main row scrolling
old_row = """    <div class="row fit q-pa-md" style="height: calc(100vh - 120px); overflow: hidden;">
        
        <!-- SIDEBAR -->
        <div class="col-12 col-md-3 q-pr-md flex column" style="height: 100%; overflow-y: auto;">"""

new_row = """    <div class="row q-pa-md" style="height: 100vh; max-height: calc(100vh - 100px); overflow: hidden;">
        
        <!-- SIDEBAR -->
        <div class="col-12 col-md-3 q-pr-md flex column" style="height: 100%; overflow-y: hidden;">"""
content = content.replace(old_row, new_row)

# 2. Replace the Floor Management Card
old_floor_card = """            <q-card dark class="bg-grey-9 q-mb-md">
                <q-card-section>
                    <div class="row justify-between items-center">
                        <div class="text-h6 text-primary">Floor Management</div>
                        <q-btn flat round icon="undo" color="info" size="sm" @click="undo"><q-tooltip>Undo (Ctrl+Z) or press Delete key to remove</q-tooltip></q-btn>
                    </div>
                    
                    <div v-if="activeDeck" class="q-mt-sm row items-center q-gutter-x-sm">
                        <q-btn outline round color="primary" icon="arrow_downward" @click="goDeckDown" :disable="activeDeckIndex <= 0" size="sm">
                            <q-tooltip>Floor Down</q-tooltip>
                        </q-btn>
                        
                        <q-input dark dense filled v-model="activeDeck.name" class="col text-center" input-class="text-center text-bold" />
                        
                        <q-btn outline round color="primary" icon="arrow_upward" @click="goDeckUp" :disable="activeDeckIndex >= store.deckPlan.decks.length - 1" size="sm">
                            <q-tooltip>Floor Up</q-tooltip>
                        </q-btn>
                        
                        <q-btn round color="accent" icon="add" @click="addDeck" size="sm" class="q-ml-xs">
                            <q-tooltip>Add New Floor</q-tooltip>
                        </q-btn>
                        
                        <q-btn round color="negative" icon="remove" @click="removeDeck" size="sm" class="q-ml-xs" :disable="store.deckPlan.decks.length <= 1">
                            <q-tooltip>Delete Current Floor</q-tooltip>
                        </q-btn>
                    </div>
                    
                    <div class="q-mt-md text-subtitle2 text-accent">Sections</div>
                    <q-select v-if="activeDeck" dark dense filled v-model="activeSectionId" :options="activeDeck.sections" option-value="id" option-label="name" emit-value map-options class="q-mt-sm"></q-select>
                    
                    <div v-if="activeSection" class="q-mt-sm q-pa-sm bg-dark rounded-borders">
                        <div class="row q-col-gutter-sm items-center">
                            <div class="col-4">
                                <q-input dark dense filled type="number" v-model.number="deckWidth" label="Width"></q-input>
                            </div>
                            <div class="col-4">
                                <q-input dark dense filled type="number" v-model.number="deckHeight" label="Height"></q-input>
                            </div>
                            <div class="col-4">
                                <q-btn color="primary" class="full-width" @click="updateDeckSize">Resize</q-btn>
                            </div>
                        </div>
                        <q-separator dark class="q-my-sm" />
                        <div class="row q-col-gutter-sm">
                            <div class="col-6"><q-btn outline color="info" size="sm" class="full-width" icon="content_copy" @click="copySection">Copy</q-btn></div>
                            <div class="col-6"><q-btn outline :disable="clipboard.length===0" color="secondary" size="sm" class="full-width" icon="content_paste" @click="pasteSection">Paste</q-btn></div>
                            <div class="col-12"><q-separator dark class="q-my-xs" /></div>
                            <div class="col-6"><q-btn outline color="accent" size="sm" class="full-width" icon="flip" @click="flipX">Flip X</q-btn></div>
                            <div class="col-6"><q-btn outline color="accent" size="sm" class="full-width" icon="flip_camera_android" @click="flipY">Flip Y</q-btn></div>
                            <div class="col-12"><q-btn outline color="negative" size="sm" class="full-width q-mt-xs" icon="delete_sweep" @click="clearSection">Clear All Structural</q-btn></div>
                        </div>
                    </div>
                </q-card-section>
            </q-card>"""

new_floor_card = """            <q-card dark class="bg-grey-9 q-mb-md flex column" style="flex-shrink: 0;">
                <q-card-section>
                    <!-- Top Bar: +/- FloorName Down/Up -->
                    <div v-if="activeDeck" class="row items-center justify-between q-mb-sm">
                        <div class="row q-gutter-x-xs">
                            <q-btn round outline color="negative" icon="remove" @click="removeDeck" size="xs" :disable="store.deckPlan.decks.length <= 1"><q-tooltip>Remove Floor</q-tooltip></q-btn>
                            <q-btn round color="accent" icon="add" @click="addDeck" size="xs"><q-tooltip>Add Floor</q-tooltip></q-btn>
                        </div>
                        
                        <div class="col q-px-sm">
                            <q-input dark dense borderless v-model="activeDeck.name" input-class="text-center text-bold text-primary" style="font-size: 1.1em; padding: 0;" />
                        </div>
                        
                        <div class="row q-gutter-x-xs">
                            <q-btn round outline color="primary" icon="arrow_downward" @click="goDeckDown" size="xs" :disable="activeDeckIndex <= 0"><q-tooltip>Floor Down</q-tooltip></q-btn>
                            <q-btn round outline color="primary" icon="arrow_upward" @click="goDeckUp" size="xs" :disable="activeDeckIndex >= store.deckPlan.decks.length - 1"><q-tooltip>Floor Up</q-tooltip></q-btn>
                        </div>
                    </div>
                    
                    <!-- Mini Diagram -->
                    <div class="mini-diagram bg-dark rounded-borders q-pa-sm" style="border: 1px solid #4BB5C1;">
                        <div v-for="(row, rIdx) in masterMapLayout" :key="rIdx" class="row justify-center q-gutter-x-xs q-mb-xs">
                            <div v-for="sec in row" :key="sec" 
                                 class="col text-center rounded-borders cursor-pointer ellipsis" 
                                 :class="activeSectionId === sec ? 'bg-primary text-dark text-bold' : 'bg-grey-8 text-white'"
                                 style="border: 1px solid #333; padding: 4px 2px; font-size: 0.75em; min-height: 24px; display: flex; align-items: center; justify-content: center; transition: all 0.2s;"
                                 @click="activeSectionId = sec">
                                 {{ sec.replace('Center', 'Ctr').replace('Starboard', 'Stbd') }}
                            </div>
                        </div>
                    </div>

                    <!-- Active Section Tools -->
                    <div v-if="activeSection" class="q-mt-sm row items-center justify-between q-gutter-x-sm">
                        <div class="col">
                            <q-input dark dense filled type="number" v-model.number="deckWidth" label="Width"></q-input>
                        </div>
                        <div class="col">
                            <q-input dark dense filled type="number" v-model.number="deckHeight" label="Height"></q-input>
                        </div>
                        <q-btn outline color="primary" @click="updateDeckSize" padding="sm" icon="check" />
                        <q-btn flat round icon="undo" color="info" size="sm" @click="undo"><q-tooltip>Undo (Ctrl+Z)</q-tooltip></q-btn>
                    </div>

                    <div v-if="activeSection" class="q-mt-sm row q-col-gutter-xs">
                        <div class="col-3"><q-btn outline color="info" size="xs" class="full-width" icon="content_copy" @click="copySection"><q-tooltip>Copy</q-tooltip></q-btn></div>
                        <div class="col-3"><q-btn outline :disable="clipboard.length===0" color="secondary" size="xs" class="full-width" icon="content_paste" @click="pasteSection"><q-tooltip>Paste</q-tooltip></q-btn></div>
                        <div class="col-3"><q-btn outline color="accent" size="xs" class="full-width" icon="flip" @click="flipX"><q-tooltip>Flip X</q-tooltip></q-btn></div>
                        <div class="col-3"><q-btn outline color="accent" size="xs" class="full-width" icon="flip_camera_android" @click="flipY"><q-tooltip>Flip Y</q-tooltip></q-btn></div>
                        <div class="col-12 q-mt-xs"><q-btn outline color="negative" size="xs" class="full-width" icon="delete_sweep" @click="clearSection">Clear Structural</q-btn></div>
                    </div>
                </q-card-section>
            </q-card>"""

content = content.replace(old_floor_card, new_floor_card)

with open("/home/dimble/WebstormProjects/starship-architect/public/warships/js/deckplan.js", "w") as f:
    f.write(content)

