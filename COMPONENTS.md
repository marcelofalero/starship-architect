# Component Definition and Behavior Documentation

This document explains how ship components are defined in `data.json` and how their behaviors and interactions are implemented in the application logic.

## 1. Component Definition (`data.json`)

Components are defined in the `EQUIPMENT` array within `data.json`. Each component definition object includes properties that determine its cost, availability, size restrictions, and effects on the ship.

### Common Properties

*   `id`: A unique string identifier for the component (e.g., `"shield_gen_20"`, `"engine_1"`).
*   `name`: The display name of the component.
*   `category`: Used for grouping in the UI (e.g., "Defense Systems", "Movement Systems").
*   `group`: A sub-grouping (e.g., "Shield Generators", "Sublight Drives").
*   `type`: Defines the component type (e.g., `"system"`, `"weapon"`, `"engine"`, `"cargo"`).
*   `baseCost`: The base credit cost.
*   `baseEp`: The base Emplacement Point (EP) cost.
*   `sizeMult`: Boolean. If `true`, the cost is multiplied by the ship's size multiplier (`SIZE_COST_MULTIPLIERS`).
*   `availability`: The availability code (e.g., "Common", "Licensed", "Restricted", "Military", "Illegal").
*   `minShipSize` / `maxSize`: Restricts installation based on ship size category.

## 2. Stats & Modifiers

The `stats` object within a component definition dictates how it modifies the ship's derived statistics. This logic is primarily handled in `js/store.js` within the `currentStats` computed property.

### Behavior Types

There are two main ways `stats` properties behave: **Setting** a base value or **Adding** a bonus.

#### Setting Base Values (Overrides)
Some stats set the ship's capability level directly. If multiple components provide these stats, the logic determines which one applies (often the last one or the best one).

*   **`sr` (Shield Rating)**:
    *   **Definition**: `stats: { "sr": 30 }`
    *   **Behavior**: Sets the base Shield Rating of the ship.
    *   **Example**: Installing a *Shield Generator (SR 30)* sets the ship's SR to 30. If you replace it with an SR 50 generator, the SR becomes 50.
*   **`speed`**:
    *   **Definition**: `stats: { "speed": 4 }`
    *   **Behavior**: Sets the base speed (in squares). This is typically used by Engines.
*   **`hyperdrive`**:
    *   **Definition**: `stats: { "hyperdrive": 1 }`
    *   **Behavior**: Sets the Hyperdrive class. The logic looks for the *lowest* (best) value among all installed components.

#### Adding Bonuses (Modifiers)
Other stats add to the ship's existing values.

*   **`sr_bonus`**: Adds to the total SR.
    *   *Example*: A "Tech Spec: Shields" upgrade might have `stats: { "sr_bonus": 10 }`. If the ship has a base SR of 30, the total SR becomes 40.
*   **`armor_bonus`**: Adds to the ship's Reflex Defense armor value.
    *   *Example*: *Starship Armor (+2)* has `stats: { "armor_bonus": 2 }`.
*   **`hp_bonus_pct`**: Increases the ship's Hit Points by a percentage.
    *   *Example*: *Reinforced Bulkheads (+10%)* has `stats: { "hp_bonus_pct": 0.1 }`.
*   **`dex_bonus`, `str_bonus`, `perception_bonus`**: Add directly to the respective attribute or skill modifier.
*   **`speed_factor`**: Multiplies the base speed.
*   **`hyperdrive_bonus`**: Adds (or subtracts) from the Hyperdrive class number (e.g., -1 Class).

## 3. Exclusive Groups

The `exclusiveGroup` property is used to enforce "one-of-a-kind" installation logic.

*   **Definition**: `exclusiveGroup: "group_name"`
*   **Behavior**: When adding a component that belongs to an `exclusiveGroup`, the application checks if another component with the *same* group is already installed. If found, the existing component is **automatically removed** before the new one is added.

### Examples

*   **Engines (`exclusiveGroup: "engine"`)**:
    *   All sublight drives (e.g., `engine_1`, `engine_2`) share this group.
    *   This ensures a ship cannot have multiple sublight drives stacking their speeds. Installing a "Speed 4" engine replaces the "Speed 2" engine.
*   **Shield Generators (`exclusiveGroup: "shield"`)**:
    *   Standard shield generators share this group. You replace one generator with another, rather than stacking them.
*   **Armor (`exclusiveGroup: "armor"`)**:
    *   Prevents stacking multiple "Starship Armor" systems.

## 4. Implicit Behaviors & Logic

Some component behaviors rely on specific properties or logic conventions.

### Weapon Damage
Damage is explicitly defined in `data.json` for each weapon via the `damage` property (e.g., `"3d10x2"`). This property is read directly by the UI to display damage values.

### EP Calculation (`js/store.js`)
*   **`ep_dynamic_pct`**: If defined in `stats`, the EP cost is calculated as a percentage of the chassis's Base EP.
*   **Batteries**: If `modifications.batteryCount` > 1, the EP cost is multiplied by the count.
