import os

with open("/home/dimble/WebstormProjects/starship-architect/public/warships/js/deckplan.js", "r") as f:
    content = f.read()

# Remove the Tools card from the sidebar
tools_card = """            <q-card dark class="bg-grey-9 q-mb-md">
                <q-card-section>
                    <div class="row justify-between items-center">
                        <div class="text-h6 text-primary">Tools</div>
                        <q-toggle v-model="showMasterMap" label="Master Map" color="accent" />
                    </div>
                    <div v-if="!showMasterMap" class="q-mt-sm row q-col-gutter-sm">
                        <div class="col-12"><q-btn :color="activeTool === 'select' ? 'accent' : 'grey-8'" class="full-width" @click="activeTool = 'select'">Select / Move / Resize</q-btn></div>
                        <div class="col-6"><q-btn :color="activeTool === 'floor' ? 'primary' : 'grey-8'" class="full-width" @click="activeTool = 'floor'">+ Floor</q-btn></div>
                        <div class="col-6"><q-btn :color="activeTool === 'wall' ? 'primary' : 'grey-8'" class="full-width" @click="activeTool = 'wall'">+ Wall</q-btn></div>
                        <div class="col-6"><q-btn :color="activeTool === 'door' ? 'primary' : 'grey-8'" class="full-width" @click="activeTool = 'door'">+ Door</q-btn></div>
                        <div class="col-6"><q-btn :color="activeTool === 'elevator' ? 'primary' : 'grey-8'" class="full-width" @click="activeTool = 'elevator'">+ Elevator</q-btn></div>
                        <div class="col-6"><q-btn :color="activeTool === 'stairs' ? 'primary' : 'grey-8'" class="full-width" @click="activeTool = 'stairs'">+ Stairs</q-btn></div>
                        <div class="col-6"><q-btn :color="activeTool === 'ladder' ? 'primary' : 'grey-8'" class="full-width" @click="activeTool = 'ladder'">+ Ladder</q-btn></div>
                        <div class="col-6"><q-btn :color="activeTool === 'tunnel' ? 'primary' : 'grey-8'" class="full-width" @click="activeTool = 'tunnel'">+ Tunnel</q-btn></div>
                        <div class="col-12"><q-btn :color="activeTool === 'erase' ? 'negative' : 'grey-8'" class="full-width" @click="activeTool = 'erase'">Erase (Click Item)</q-btn></div>
                        <div class="col-12"><q-separator dark class="q-my-sm" /></div>
                        <div class="col-6"><q-btn :disable="selectedItemIds.length===0" color="secondary" outline size="sm" class="full-width" @click="bringToFront">Bring to Front</q-btn></div>
                        <div class="col-6"><q-btn :disable="selectedItemIds.length===0" color="secondary" outline size="sm" class="full-width" @click="sendToBack">Send to Back</q-btn></div>
                    </div>
                </q-card-section>
            </q-card>
            """
content = content.replace(tools_card, "")

# Modify the Map canvas container
old_canvas_start = """        <!-- MAIN CANVAS/GRID -->
        <div class="col-12 col-md-9" style="height: 100%; overflow: auto; background-color: #000; border: 2px solid #4BB5C1; position: relative;" @mouseleave="onGridMouseUp" @mouseup="onGridMouseUp">"""

new_canvas_start = """        <!-- MAIN CANVAS/GRID CONTAINER -->
        <div class="col-12 col-md-9 flex column" style="height: 100%;">
            
            <q-toolbar class="bg-dark text-white q-mb-sm rounded-borders shadow-2" style="border: 1px solid #4BB5C1;">
                <q-toggle v-model="showMasterMap" label="Master Map" color="accent" class="q-mr-md" />
                
                <template v-if="!showMasterMap">
                    <q-separator dark vertical class="q-mx-sm" />
                    
                    <q-btn-group outline class="q-mr-sm">
                        <q-btn :color="activeTool === 'select' ? 'accent' : 'grey-8'" icon="near_me" @click="activeTool = 'select'"><q-tooltip>Select / Move / Resize</q-tooltip></q-btn>
                        <q-btn :color="activeTool === 'floor' ? 'primary' : 'grey-8'" label="Floor" @click="activeTool = 'floor'" />
                        <q-btn :color="activeTool === 'wall' ? 'primary' : 'grey-8'" label="Wall" @click="activeTool = 'wall'" />
                        <q-btn :color="activeTool === 'door' ? 'primary' : 'grey-8'" label="Door" @click="activeTool = 'door'" />
                        <q-btn :color="activeTool === 'elevator' ? 'primary' : 'grey-8'" icon="elevator" @click="activeTool = 'elevator'"><q-tooltip>Elevator</q-tooltip></q-btn>
                        <q-btn :color="activeTool === 'stairs' ? 'primary' : 'grey-8'" icon="stairs" @click="activeTool = 'stairs'"><q-tooltip>Stairs</q-tooltip></q-btn>
                        <q-btn :color="activeTool === 'ladder' ? 'primary' : 'grey-8'" icon="format_align_justify" @click="activeTool = 'ladder'"><q-tooltip>Ladder</q-tooltip></q-btn>
                        <q-btn :color="activeTool === 'tunnel' ? 'primary' : 'grey-8'" icon="panorama_horizontal" @click="activeTool = 'tunnel'"><q-tooltip>Tunnel</q-tooltip></q-btn>
                        <q-btn :color="activeTool === 'erase' ? 'negative' : 'grey-8'" icon="delete" @click="activeTool = 'erase'"><q-tooltip>Erase (Click Item)</q-tooltip></q-btn>
                    </q-btn-group>

                    <q-space />

                    <q-btn-group outline>
                        <q-btn :disable="selectedItemIds.length===0" color="secondary" outline icon="flip_to_front" label="Front" @click="bringToFront"><q-tooltip>Bring to Front</q-tooltip></q-btn>
                        <q-btn :disable="selectedItemIds.length===0" color="secondary" outline icon="flip_to_back" label="Back" @click="sendToBack"><q-tooltip>Send to Back</q-tooltip></q-btn>
                    </q-btn-group>
                </template>
            </q-toolbar>

            <!-- MAIN CANVAS/GRID -->
            <div class="col" style="overflow: auto; background-color: #000; border: 2px solid #4BB5C1; position: relative;" @mouseleave="onGridMouseUp" @mouseup="onGridMouseUp">"""

content = content.replace(old_canvas_start, new_canvas_start)

# Add missing closing div tag if needed (since we added a div.col inside the flex column)
# Let's count divs.
# The original had:
# <div class="col-12 col-md-9" ...>
#    <div v-if="showMasterMap"...></div>
#    <div v-else-if="activeSection"...></div>
# </div>
# The new has:
# <div class="col-12 col-md-9 flex column"...>
#    <q-toolbar>...</q-toolbar>
#    <div class="col" ...>
#        <div v-if="showMasterMap"...></div>
#        <div v-else-if="activeSection"...></div>
#    </div>
# </div>
# So we need to add a closing div at the end of the template.
template_end = """        </div>
        
    </div>
    `
};"""
new_template_end = """        </div>
        </div>
        
    </div>
    `
};"""
content = content.replace(template_end, new_template_end)

with open("/home/dimble/WebstormProjects/starship-architect/public/warships/js/deckplan.js", "w") as f:
    f.write(content)

