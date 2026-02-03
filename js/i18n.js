const { createI18n, useI18n } = VueI18n;

export const messages = {
    en: {
        ui: {
            hangar: "New Ship", sheet: "Sheet", export: "Save Ship", manifest: "Systems Manifest",
            overview: "Overview", systems: "Systems", config: "Config", free_ep: "Free EP",
            install_system: "Install System", install_caption: "Select category, type, and specific component.",
            category: "Category", sys_type: "System Type", component: "Component",
            non_standard: "Rare / Non-standard (Cost x5, EP x2)",
            non_standard_tip: "Multiplies Cost by 5 and EP by 2 for ill-suited or rare components.",
            ns_tag: "Non-Std", cost_variable: "Cost: Variable", base_cost: "Base Cost", base_ep: "Base EP",
            avail: "Availability", variable: "Variable", size_mult_msg: "Includes {size} size multiplier",
            cancel: "Cancel", install: "Install", new_stock: "New from Stock", import_file: "Import File",
            upload_yaml: "Upload Ship YAML", select_file: "Select File", max_size: "Max Size", min_size: "Min Size",
            engineering: "Engineering", designer: "Starship Designer", self_built: "Self-Built",
            ledger: "Ledger", hull_base: "Hull Base", lic_fees: "Licensing Fees", total: "Total",
            template: "Template", none: "None", chassis: "Chassis", market_avail: "Market Availability",
            starship_designer_tip: "Waives Non-standard penalties. Enables custom components.",
            installed_systems: "Installed Systems", print_btn: "Print to PDF / Paper",
            convert_cargo_ep: "Convert Cargo to EP", cargo_to_ep_hint: "{sizeMult} tons = 1 EP",
            max_cargo: "Max Cargo", cargo_converted: "Cargo Converted", close: "Close",
            ship_name: "Ship Name", import: "Load Ship"
        },
        stats: {
            str: "STR", dex: "DEX", int: "INT", ref: "Reflex Defense", armor: "Armor",
            hp: "HP", shields: "Shields", dr: "DR", speed: "Speed"
        },
        cat: {
            fighters: "Fighters", freighters: "Freighters", capitals: "Capital Ships",
            weapons: "Weapon Systems", movement: "Movement Systems", defense: "Defense Systems",
            components: "Components", accessories: "Starship Accessories"
        },
        avail: {
            Common: "Common", Licensed: "Licensed", Restricted: "Restricted",
            Military: "Military", Illegal: "Illegal"
        }
    },
    es: {
        ui: {
            hangar: "Hangar", sheet: "Ficha", export: "Exportar", manifest: "Manifiesto de Sistemas",
            overview: "Resumen", systems: "Sistemas", config: "Config", free_ep: "PE Libre",
            install_system: "Instalar Sistema", install_caption: "Seleccione categoría, tipo y componente específico.",
            category: "Categoría", sys_type: "Tipo de Sistema", component: "Componente",
            non_standard: "Raro / No Estándar (Costo x5, PE x2)",
            non_standard_tip: "Multiplica Costo por 5 y PE por 2 para componentes raros o inadecuados.",
            ns_tag: "No-Est", cost_variable: "Costo: Variable", base_cost: "Costo Base", base_ep: "PE Base",
            avail: "Disponibilidad", variable: "Variable", size_mult_msg: "Incluye multiplicador de tamaño {size}",
            cancel: "Cancelar", install: "Instalar", new_stock: "Nuevo de Stock", import_file: "Importar Archivo",
            upload_yaml: "Subir YAML de Nave", select_file: "Seleccionar Archivo", max_size: "Tamaño Máx", min_size: "Tamaño Mín",
            engineering: "Ingeniería", designer: "Diseñador de Naves", self_built: "Construcción Propia",
            ledger: "Libro Mayor", hull_base: "Base del Casco", lic_fees: "Tasas de Licencia", total: "Total",
            template: "Plantilla", none: "Ninguno", chassis: "Chasis", market_avail: "Disponibilidad de Mercado",
            starship_designer_tip: "Anula penalizaciones No Estándar. Permite componentes personalizados.",
            installed_systems: "Sistemas Instalados", print_btn: "Imprimir en PDF / Papel",
            convert_cargo_ep: "Convertir Carga a PE", cargo_to_ep_hint: "{sizeMult} tons = 1 PE",
            max_cargo: "Carga Máx", cargo_converted: "Carga Convertida", close: "Cerrar",
            ship_name: "Nombre de Nave", import: "Importar"
        },
        stats: {
            str: "FUE", dex: "DES", int: "INT", ref: "Defensa de Reflejos", armor: "Armadura",
            hp: "PV", shields: "Escudos", dr: "RD", speed: "Velocidad"
        },
        cat: {
            fighters: "Cazas", freighters: "Cargueros", capitals: "Naves Capitales",
            weapons: "Sistemas de Armas", movement: "Sistemas de Movimiento", defense: "Sistemas Defensivos",
            components: "Componentes", accessories: "Accesorios"
        },
        avail: {
            Common: "Común", Licensed: "Licenciado", Restricted: "Restringido",
            Military: "Militar", Illegal: "Ilegal"
        }
    }
};

export const i18n = createI18n({ locale: 'en', fallbackLocale: 'en', messages, legacy: false });

export const getLocalizedName = (item) => {
    if (!item) return '';
    return i18n.global.locale.value === 'es' && item.name_es ? item.name_es : item.name;
};
