# Starship Components Report

This report lists all starship components defined in `data.json`, grouped by category and group.

## Defense Systems

### Armor

| Name | Cost | EP | Size Mult | Availability | Exclusive Group | Notes |
|---|---|---|---|---|---|---|
| Starship Armor (+1) | 2,000 | 2 | Yes | Licensed | armor | **Stats:** armor_bonus: 1<br>Starship Armor is bought as an Equipment bonus to the Armor a Starship adds to its Reflex Defense. Skilled pilots often prefer ships without heavy armor, since they can use their Character Level in place of a ship's Armor bonus in any case. |
| Starship Armor (+2) | 5,000 | 5 | Yes | Restricted | armor | **Stats:** armor_bonus: 2<br>Starship Armor is bought as an Equipment bonus to the Armor a Starship adds to its Reflex Defense. Skilled pilots often prefer ships without heavy armor, since they can use their Character Level in place of a ship's Armor bonus in any case. |
| Starship Armor (+3) | 10,000 | 10 | Yes | Military | armor | **Stats:** armor_bonus: 3<br>Starship Armor is bought as an Equipment bonus to the Armor a Starship adds to its Reflex Defense. Skilled pilots often prefer ships without heavy armor, since they can use their Character Level in place of a ship's Armor bonus in any case. |
| Starship Armor (+4) | 20,000 | 20 | Yes | Military | armor | **Stats:** armor_bonus: 4<br>Starship Armor is bought as an Equipment bonus to the Armor a Starship adds to its Reflex Defense. Skilled pilots often prefer ships without heavy armor, since they can use their Character Level in place of a ship's Armor bonus in any case. |
| Reinforced Bulkheads (+10%) | 2,000 | 2 | Yes | Common | bulkheads | **Stats:** hp_bonus_pct: 0.1<br>Reinforced Bulkheads increase a Starship's Hit Points by 10% (These improvements don't stack). |
| Reinforced Bulkheads (+20%) | 5,000 | 5 | Yes | Licensed | bulkheads | **Stats:** hp_bonus_pct: 0.2<br>Reinforced Bulkheads increase a Starship's Hit Points by 20% (These improvements don't stack). |
| Reinforced Bulkheads (+30%) | 10,000 | 10 | Yes | Restricted | bulkheads | **Stats:** hp_bonus_pct: 0.3<br>Reinforced Bulkheads increase a Starship's Hit Points by 30% (These improvements don't stack). |
| Reinforced Keel | 4,000 | 2 | Yes | Military | keel | A Reinforced Keel causes the ship to take only half damage from Collisions. If the ship Rams another, it deals +2 damage per die. |
| Reinforced Keel, Boarding | 10,000 | 4 | Yes | Military | keel | Boarding Keels function as Reinforced Keels but can also dock with an enemy ship after a successful ram that moves the target down the Condition Track, allowing boarders to invade. |

### Electronic Warfare

| Name | Cost | EP | Size Mult | Availability | Exclusive Group | Notes |
|---|---|---|---|---|---|---|
| Com Jammers | 20,000 | 1 | No | Military | - | A Com Jammer prevents any communication within 6 squares. It takes a DC 30 Use Computer check to send or receive a message within this area. The jamming ship is also affected and is easier to detect (+20 to sensors checks). |
| Droid Jammer | 1,000 | 1 | No | Military | - | Attacks from the Starship gain a +2 Equipment bonus to hit automated craft (like Droid Starfighters) within a 5-square radius. |
| Jamming Array | 20,000 | 5 | Yes | Common | - | A Jamming Array affects all enemy Starships within 6 squares, regardless of size. The penalty on Use Computer checks is -6 for Starfighters, -4 for Space Transports, and -2 for Capital Ships. |
| Jamming Suite | 5,000 | 1 | Yes | Common | - | A Jamming Suite targets a single enemy within 6 squares. The target takes penalties on Use Computer checks (-4 for Starfighters, -2 for Space Transports) and enemy fire control systems. |
| Sensor Baffling | 20,000 | 1 | Yes | Restricted | - | Allows Stealth checks without Cover/Concealment. Benefit lost if moving > Speed. |
| Sensor Decoy | 2,000 | 1 | No | Restricted | - | Missile that emulates a Starship on sensors. DC 25 Use Computer to identify. Revealed by visual range (1-20 squares depending on size). Includes 3 decoys. |
| Sensor Mask | 150,000 | 2 | Yes | Illegal | - | Replicates sensor signals to make ship appear transparent. Adds +10 to DC of Use Computer checks to detect the ship. |
| Cloaking Device (Hibridium) | 50,000 | 3 | Yes | Military | cloaking_device | Grants Total Concealment. Produces 'Double-Blind' effect: occupants cannot see out while active. Treats all other targets as having Total Concealment. |
| Cloaking Device (Stygium) | 100,000,000 | 1 | Yes | Military | cloaking_device | Ancient and rare technology using Stygium crystals. Grants Total Concealment without the 'Double-Blind' penalty. Extremely expensive and hard to find. |

### Generators

| Name | Cost | EP | Size Mult | Availability | Exclusive Group | Notes |
|---|---|---|---|---|---|---|
| Auxiliary Generator (+2) | 2,000 | 1 | No | Common | - | **Stats:** str_bonus: 2<br>Supplies power to specific systems. Gives a +2 equipment bonus to Strength. Allows systems to continue when engines are shut down. |
| Auxiliary Generator (+4) | 5,000 | 1 | No | Common | - | **Stats:** str_bonus: 4<br>Supplies power to specific systems. Gives a +4 equipment bonus to Strength. |
| Auxiliary Generator (+6) | 10,000 | 1 | No | Common | - | **Stats:** str_bonus: 6<br>Supplies power to specific systems. Gives a +6 equipment bonus to Strength. |

### Security

| Name | Cost | EP | Size Mult | Availability | Exclusive Group | Notes |
|---|---|---|---|---|---|---|
| Anti-Boarding Systems | 20,000 | 5 | Yes | Restricted | - | Anti-Boarding Systems include blast doors (DR 10, 250 HP), security cameras, and blaster rifle turrets at vital locations. The system has independent backup power allowing turrets to make up to 50 shots after power loss. |
| Security Bracing | 2,000 | 2 | Yes | Common | - | Security Bracing protects Passenger Conversions and Escape Pods. When the ship is destroyed by massive damage, subtract the ship's DR from damage dealt to anyone in the protected area. |

### Shield Generators

| Name | Cost | EP | Size Mult | Availability | Exclusive Group | Notes |
|---|---|---|---|---|---|---|
| Shield Generator (SR 10) | 750 | 1 | Yes | Common | shield | **Stats:** sr: 10<br>Not all Starships have deflector shields, and they are an extremely popular addition for those that lack them. However, the energy and space cost of Starship Shields is extremely high, and it grows with the size of the craft to be protected. |
| Shield Generator (SR 100) | 20,000 | 5 | Yes | Common | shield | **Stats:** sr: 100 |
| Shield Generator (SR 125) | 25,000 | 6 | Yes | Common | shield | **Stats:** sr: 125 |
| Shield Generator (SR 15) | 1,000 | 1 | Yes | Common | shield | **Stats:** sr: 15<br>Not all Starships have deflector shields, and they are an extremely popular addition for those that lack them. However, the energy and space cost of Starship Shields is extremely high, and it grows with the size of the craft to be protected. |
| Shield Generator (SR 150) | 30,000 | 7 | Yes | Common | shield | **Stats:** sr: 150 |
| Shield Generator (SR 175) | 40,000 | 8 | Yes | Common | shield | **Stats:** sr: 175 |
| Shield Generator (SR 20) | 1,250 | 1 | Yes | Common | shield | **Stats:** sr: 20<br>Not all Starships have deflector shields, and they are an extremely popular addition for those that lack them. However, the energy and space cost of Starship Shields is extremely high, and it grows with the size of the craft to be protected. |
| Shield Generator (SR 200) | 50,000 | 10 | Yes | Common | shield | **Stats:** sr: 200 |
| Shield Generator (SR 25) | 1,500 | 1 | Yes | Common | shield | **Stats:** sr: 25<br>Not all Starships have deflector shields, and they are an extremely popular addition for those that lack them. However, the energy and space cost of Starship Shields is extremely high, and it grows with the size of the craft to be protected. |
| Shield Generator (SR 30) | 2,000 | 2 | Yes | Common | shield | **Stats:** sr: 30<br>Not all Starships have deflector shields, and they are an extremely popular addition for those that lack them. However, the energy and space cost of Starship Shields is extremely high, and it grows with the size of the craft to be protected. |
| Shield Generator (SR 35) | 2,500 | 2 | Yes | Common | shield | **Stats:** sr: 35<br>Not all Starships have deflector shields, and they are an extremely popular addition for those that lack them. However, the energy and space cost of Starship Shields is extremely high, and it grows with the size of the craft to be protected. |
| Shield Generator (SR 40) | 3,000 | 2 | Yes | Common | shield | **Stats:** sr: 40<br>Not all Starships have deflector shields, and they are an extremely popular addition for those that lack them. However, the energy and space cost of Starship Shields is extremely high, and it grows with the size of the craft to be protected. |
| Shield Generator (SR 45) | 4,000 | 2 | Yes | Common | shield | **Stats:** sr: 45<br>Not all Starships have deflector shields, and they are an extremely popular addition for those that lack them. However, the energy and space cost of Starship Shields is extremely high, and it grows with the size of the craft to be protected. |
| Shield Generator (SR 5) | 500 | 1 | Yes | Common | shield | **Stats:** sr: 5<br>Not all Starships have deflector shields, and they are an extremely popular addition for those that lack them. However, the energy and space cost of Starship Shields is extremely high, and it grows with the size of the craft to be protected. |
| Shield Generator (SR 50) | 5,000 | 3 | Yes | Common | shield | **Stats:** sr: 50<br>Not all Starships have deflector shields, and they are an extremely popular addition for those that lack them. However, the energy and space cost of Starship Shields is extremely high, and it grows with the size of the craft to be protected. |
| Shield Generator (SR 55) | 6,000 | 3 | Yes | Common | shield | **Stats:** sr: 55<br>Not all Starships have deflector shields, and they are an extremely popular addition for those that lack them. However, the energy and space cost of Starship Shields is extremely high, and it grows with the size of the craft to be protected. |
| Shield Generator (SR 60) | 8,000 | 3 | Yes | Common | shield | **Stats:** sr: 60<br>Not all Starships have deflector shields, and they are an extremely popular addition for those that lack them. However, the energy and space cost of Starship Shields is extremely high, and it grows with the size of the craft to be protected. |
| Shield Generator (SR 70) | 10,000 | 3 | Yes | Common | shield | **Stats:** sr: 70 |
| Shield Generator (SR 80) | 12,500 | 4 | Yes | Common | shield | **Stats:** sr: 80 |
| Shield Generator (SR 90) | 15,000 | 4 | Yes | Common | shield | **Stats:** sr: 90 |

### Shields

| Name | Cost | EP | Size Mult | Availability | Exclusive Group | Notes |
|---|---|---|---|---|---|---|
| Anti-Concussion Field | 5,000 | 5 | Yes | Military | - |  |
| Backup Shield Generator | 2,000 | 1 | Yes | Common | - |  |
| Regenerating Shields | 5,000 | 2 | Yes | Restricted | shield_mod | **Stats:** regenerating: True<br>If a ship possesses Regenerating Shields, its current Shield Rating increases by 10 (Up to its maximum Shield Rating) when a System Operator uses the Recharge Shields Action. |

## Modifications

### Superior Tech

| Name | Cost | EP | Size Mult | Availability | Exclusive Group | Notes |
|---|---|---|---|---|---|---|
| Armor (+2 Armor) | 0 | 0 | No | Rare | tech_upgrade | **Stats:** armor_bonus: 2 |
| Shields (+20 SR) | 0 | 0 | No | Rare | tech_upgrade | **Stats:** sr_bonus: 20 |
| Superior Dex (+4 Dex) | 0 | 0 | No | Rare | tech_upgrade | **Stats:** dex_bonus: 4 |
| Superior Sensors (+2 Per) | 0 | 0 | No | Rare | tech_upgrade | **Stats:** perception_bonus: 2 |
| Superior Speed (+33%) | 0 | 0 | No | Rare | tech_upgrade | **Stats:** speed_factor: 0.333 |
| Superior Str (+2 Str) | 0 | 0 | No | Rare | tech_upgrade | **Stats:** str_bonus: 2 |

### Tech Specialist

| Name | Cost | EP | Size Mult | Availability | Exclusive Group | Notes |
|---|---|---|---|---|---|---|
| Enhanced Dexterity (+2 Dex) | 0 | 0 | No | Common | tech_upgrade | **Stats:** dex_bonus: 2 |
| Improved Speed (+25%) | 0 | 0 | No | Common | tech_upgrade | **Stats:** speed_factor: 0.25 |
| Tech Spec: Armor (+2) | 0 | 0 | No | Common | tech_upgrade | **Stats:** armor_bonus: 2 |
| Tech Spec: Shields (+10 SR) | 0 | 0 | No | Common | tech_upgrade | **Stats:** sr_bonus: 10 |

### Uncategorized

| Name | Cost | EP | Size Mult | Availability | Exclusive Group | Notes |
|---|---|---|---|---|---|---|
| Point Defense System | 4,000 | 0 | Yes | Military | - | Automated laser system that shoots down incoming missiles. Provides a +5 bonus to Reflex Defense against missile attacks. |

### Weapon Upgrades

| Name | Cost | EP | Size Mult | Availability | Exclusive Group | Notes |
|---|---|---|---|---|---|---|
| Autoblaster Modification | 2,000 | 0 | No | Restricted | - | Modifies a single-mount weapon to be an Autoblaster. Increases cyclic rate, allowing Autofire but at -2 attack penalty. Cost is 2x the base cost of the weapon. |
| Cannon Enhancements | 3,000 | 0 | No | Restricted | - | Standard Cannon Enhancements increase damage by +1 die. Costs 2x base weapon cost. |
| Cannon Enhancements (Advanced) | 6,000 | 0 | No | Restricted | - | Advanced Cannon Enhancements increase damage by +2 dice. Costs 5x base weapon cost. Military availability. |
| Heavy Ordnance Modification | 2,000 | 0 | No | Military | - | Modifications to standard launchers to fire heavier payloads like Proton Bombs or heavy rockets. Increases damage dice by +1d10 but reduces range by 50%. |

## Movement Systems

### Environmental

| Name | Cost | EP | Size Mult | Availability | Exclusive Group | Notes |
|---|---|---|---|---|---|---|
| Amphibious Seals | 500 | 0 | Yes | Common | - | Allows Starship to function underwater. Swim speed 1/2 fly speed. Max underwater velocity 1/10 atmospheric. |

### Hyperdrives

| Name | Cost | EP | Size Mult | Availability | Exclusive Group | Notes |
|---|---|---|---|---|---|---|
| Hyperdrive Class .75 | 5,000 | 4 | Yes | Military | - | **Stats:** hyperdrive: 0.75<br>The best Hyperdrive ever created is the Class .5 (which can be created by modifying a Class .75 Hyperdrive using the Starship Designer Feat). Class .5 drives are Illegal, require heavy maintenance (8h/month, DC 20 Mechanics), and impose penalties if neglected. |
| Hyperdrive Class 1 | 3,000 | 3 | Yes | Licensed | - | **Stats:** hyperdrive: 1<br>The Class 1 Hyperdrive is considered the pinnacle of stable Hyperdrive technology from the Clone Wars forward. It is the favored technology of military vessels, but its high cost often results in designers settling for a Class 2 or Class 3 drive. |
| Hyperdrive Class 1.5 | 2,500 | 3 | Yes | Licensed | - | **Stats:** hyperdrive: 1.5<br>Class 1.5 is a standard performance hyperdrive. |
| Hyperdrive Class 10 | 200 | 1 | Yes | Common | - | **Stats:** hyperdrive: 10<br>Backup Hyperdrives, usually ranging from Class 8 to Class 15, are often used as emergency systems. Though no one wants to wait a month to arrive someplace when using a Class 10 Backup Hyperdrive, often the alternative is to drift aimlessly in space for centuries. |
| Hyperdrive Class 15 | 100 | 1 | Yes | Common | - | **Stats:** hyperdrive: 15<br>Backup Hyperdrives, usually ranging from Class 8 to Class 15, are often used as emergency systems. Though no one wants to wait a month to arrive someplace when using a Class 10 Backup Hyperdrive, often the alternative is to drift aimlessly in space for centuries. |
| Hyperdrive Class 2 | 2,000 | 3 | Yes | Common | - | **Stats:** hyperdrive: 2<br>Class 2 was state of the art during most of the Rise of the Empire era. |
| Hyperdrive Class 3 | 1,500 | 2 | Yes | Common | - | **Stats:** hyperdrive: 3<br>Class 3 was state of the art during most of the Rise of the Empire era. |
| Hyperdrive Class 4 | 1,000 | 2 | Yes | Common | - | **Stats:** hyperdrive: 4<br>A Hyperdrive of Class 4 to Class 6 is normally either old technology or an aftermarket retrofit crammed into a vessel not designed to support a Hyperdrive. |
| Hyperdrive Class 6 | 400 | 2 | Yes | Common | - | **Stats:** hyperdrive: 6<br>A Hyperdrive of Class 4 to Class 6 is normally either old technology or an aftermarket retrofit crammed into a vessel not designed to support a Hyperdrive. |
| Hyperdrive Class 8 | 300 | 1 | Yes | Common | - | **Stats:** hyperdrive: 8<br>Backup Hyperdrives, usually ranging from Class 8 to Class 15, are often used as emergency systems. Though no one wants to wait a month to arrive someplace when using a Class 10 Backup Hyperdrive, often the alternative is to drift aimlessly in space for centuries. |

### Navigation

| Name | Cost | EP | Size Mult | Availability | Exclusive Group | Notes |
|---|---|---|---|---|---|---|
| Navicomputer | 2,000 | 1 | No | Licensed | - | A Navicomputer is an astrogation calculator designed to make all the calculations necessary to travel through Hyperspace. Most Starships have Navicomputers, but those that lack Hyperdrives and some fighters that depend on Astromech Droids do not. |
| Navicomputer (Advanced) | 20,000 | 2 | No | Licensed | - | Advanced Navicomputers grant a +10 bonus on Use Computer checks made for Astrogation, rather than a typical Navicomputer's +5 bonus. Additionally, a character aboard a ship that has a Navicomputer need not be Trained in the Use Computer Skill to make use of the Astrogation aspect of the Skill. |
| Navicomputer (Limited) | 500 | 0 | No | Common | - | Most Navicomputers are Nonstandard Modifications for Starfighters - these ships simply don't have the room for the memory core. Starfighters often have Limited Navicomputers that store only two jumps' worth of information, enough to get to a destination and return. |

### Sublight Drives

| Name | Cost | EP | Size Mult | Availability | Exclusive Group | Notes |
|---|---|---|---|---|---|---|
| Baffled Drive | 100,000 | 1 | Yes | Military | - | Uses supercooled Tibanna gas. Always Speed 2 (Starship Scale). Range 100 squares before refuel. +5 to DC to detect ship. Moving 2x speed doesn't negate Sensor Baffling. |
| SubLight Accelerator Motor | 25,000 | 2 | No | Military | - | A SLAM system provides a +5 bonus on Pilot checks to increase a Vehicle's Speed. This bonus increases to +10 if the Pilot is using All-Out Movement. |
| Sublight Drive (Speed 1) | 1,000 | 2 | Yes | Common | engine | **Stats:** speed: 1<br>A Sublight Drive determines a ship's Speed when moving through Realspace. Replacing a ship's Sublight Drive can be expensive, and many ships cannot reach high speeds due to the bulk of their Sublight Drives. |
| Sublight Drive (Speed 2) | 2,000 | 3 | Yes | Common | engine | **Stats:** speed: 2<br>A Sublight Drive determines a ship's Speed when moving through Realspace. Replacing a ship's Sublight Drive can be expensive, and many ships cannot reach high speeds due to the bulk of their Sublight Drives. |
| Sublight Drive (Speed 3) | 5,000 | 4 | Yes | Licensed | engine | **Stats:** speed: 3<br>A Sublight Drive determines a ship's Speed when moving through Realspace. Replacing a ship's Sublight Drive can be expensive, and many ships cannot reach high speeds due to the bulk of their Sublight Drives. |
| Sublight Drive (Speed 4) | 10,000 | 5 | Yes | Restricted | engine | **Stats:** speed: 4<br>A Sublight Drive determines a ship's Speed when moving through Realspace. Replacing a ship's Sublight Drive can be expensive, and many ships cannot reach high speeds due to the bulk of their Sublight Drives. |
| Sublight Drive (Speed 5) | 20,000 | 6 | Yes | Military | engine | **Stats:** speed: 5<br>Only military vessels are permitted to use incredibly fast ion drives. A Sublight Drive determines a ship's Speed when moving through Realspace. |
| Sublight Drive (Speed 6) | 100,000 | 7 | Yes | Military | engine | **Stats:** speed: 6<br>Only military vessels are permitted to use incredibly fast ion drives. A Sublight Drive determines a ship's Speed when moving through Realspace. |

### Thrusters

| Name | Cost | EP | Size Mult | Availability | Exclusive Group | Notes |
|---|---|---|---|---|---|---|
| Combat Thrusters | 1,000 | 0 | Yes | Military | - | Often used by smugglers, bounty hunters, and blockade runners. A ship with Combat Thrusters is treated as one size category smaller than its actual size category for the purpose of being targeted by Capital Ship weapons. Additionally, the Space Transport is treated as a Starfighter for the purpose of Dogfighting and Starship Maneuvers. This Starship Modification does not change the ship's size modifier to Reflex Defense. |
| Atmospheric Thrusters | 2,000 | 2 | Yes | Common | atmos_thrusters | Atmospheric Thrusters increase a Starship's speed when the ship is flying in the atmosphere of a planet. Standard Atmospheric Thrusters increase a Starship's maximum velocity and fly speed by 10% (rounded down to the nearest square of speed and 10 km/h). Atmospheric Thrusters have no effect on Starship Scale movement. |
| Atmospheric Thrusters (Advanced) | 5,000 | 5 | Yes | Common | atmos_thrusters | Advanced Atmospheric Thrusters increase these by 25% (rounded down to the nearest square of speed and 10 km/h). Atmospheric Thrusters have no effect on Starship Scale movement. |
| Maneuvering Jets (+2) | 2,000 | 1 | Yes | Common | maneuvering_jets | **Stats:** dex_bonus: 2<br>Maneuvering Jets give a Starship a +2 Equipment bonus to its Dexterity score. |
| Maneuvering Jets (+4) | 5,000 | 3 | Yes | Licensed | maneuvering_jets | **Stats:** dex_bonus: 4<br>Maneuvering Jets give a Starship a +4 Equipment bonus to its Dexterity score. |
| Maneuvering Jets (+6) | 10,000 | 4 | Yes | Military | maneuvering_jets | **Stats:** dex_bonus: 6<br>Maneuvering Jets give a Starship a +6 Equipment bonus to its Dexterity score. |

## Starship Accessories

### Accommodations

| Name | Cost | EP | Size Mult | Availability | Exclusive Group | Notes |
|---|---|---|---|---|---|---|
| Cryogenic Chambers (10 units) | 500 | 2 | No | Common | - | Hibernation systems that allow live creatures to be carried in stasis. Capacity: (Cost Mod)/5 Medium creatures per unit. Large=5x space, Huge=20x. |
| Environmental Filters | 2,000 | 1 | Yes | Common | - | Allows ship to support multiple environments (gravity, atmosphere, etc.). Can be used offensively (DC 25 Use Computer) to flood sections with hazards. |
| Medical Bed | 2,000 | 1 | No | Common | - |  |
| Medical Suite | 5,000 | 2 | No | Common | - | Includes (Size Mod)/5 medical beds and (Size Mod)/50 Bacta Tanks. Medical beds function as Medpac (10 uses), Medical Kit, and Surgery Kit. |
| Passenger Conversion | 2,000 | 1 | Yes | Common | - | Provides room for (Cost Mod) passengers (Seating or Quarters). Steerage quality unless combined with Luxury Upgrade. |
| Workshop | 3,000 | 5 | No | Common | - | Fully equipped workshop. +2 Equipment bonus on Mechanics/Use Computer checks to repair/modify/construct objects. |
| Luxury Upgrade (Advanced) | 20,000 | 1 | No | Licensed | luxury | Makes the ship the equivalent of an upper-scale hotel. Gourmet cooking, quality artwork, and stylish trim. Requires monthly maintenance (1/50 of cost). |
| Luxury Upgrade (Basic) | 10,000 | 1 | No | Licensed | luxury | Changes a Starship from a harsh travel vehicle to a comfortable home. Includes comfortable beds, wardrobes, recliners, and music systems. Requires monthly maintenance (1/50 of cost). |
| Luxury Upgrade (Extreme) | 50,000 | 1 | No | Restricted | luxury | Turns a Starship into a palace in space. Increases Crew Quality by one step (max Expert), though this has no effect on hero statistics. Requires monthly maintenance (1/50 of cost). |

### Communications

| Name | Cost | EP | Size Mult | Availability | Exclusive Group | Notes |
|---|---|---|---|---|---|---|
| HoloNet Transceiver | 50,000 | 4 | No | Military | - | Extremely rare and expensive systems that allow for real-time audio, visual, and holographic communication over an unlimited range via the HoloNet. Grants a +5 Equipment bonus to Use Computer checks made to gain information. During the Empire, availability is Military (normally Restricted/Rare). |
| Hypertransceiver | 1,000 | 1 | No | Common | - | Hypertransceivers effectively have an unlimited range, allowing ships at opposite ends of the galaxy to communicate (with time lag). Allows access to information on The HoloNet. |
| Transponder (Disguised) | 2,000 | 0 | No | Illegal | - | Mimics another ship's code. Requires Use Computer + Deception check to install. -5 Deception for each additional disguised transponder. |
| Transponder (IFF) | 5,000 | 0 | No | Military | - | Military Friend/Foe transponder. Can be loaded with codes to appear as 'Friend'. Can hack enemy computers to appear as Friend (Use Computer check). |
| Transponder (Masked) | 1,000 | 0 | No | Illegal | - | Code is impossible to read. Immediately apparent and suspicious. |

### Computers

| Name | Cost | EP | Size Mult | Availability | Exclusive Group | Notes |
|---|---|---|---|---|---|---|
| Sensor Array Computer (+2 Int) | 1,000 | 1 | Yes | Common | sensor_computer | **Stats:** int_bonus: 2<br>Exclusively processes sensor data, freeing the main computer. Grants +2 Equipment bonus to Intelligence. |
| Sensor Array Computer (+4 Int) | 5,000 | 2 | Yes | Licensed | sensor_computer | **Stats:** int_bonus: 4<br>Exclusively processes sensor data, freeing the main computer. Grants +4 Equipment bonus to Intelligence. |
| Sensor Array Computer (+6 Int) | 20,000 | 4 | Yes | Restricted | sensor_computer | **Stats:** int_bonus: 6<br>Exclusively processes sensor data, freeing the main computer. Grants +6 Equipment bonus to Intelligence. |

### Control

| Name | Cost | EP | Size Mult | Availability | Exclusive Group | Notes |
|---|---|---|---|---|---|---|
| Personalized Controls | 1,000 | 0 | No | Licensed | - | Personalizes one crew position. +1 bonus on checks for owner, -2 penalty for others. |
| Slave Circuits (Advanced) | 4,000 | 1 | Yes | Military | slave_circuits | Reduces crew requirements by 2/3 (minimum 1). |
| Slave Circuits (Basic) | 1,000 | 1 | Yes | Restricted | slave_circuits | Reduces crew requirements by 1/3 (minimum 1). |
| Slave Circuits (Recall) | 6,000 | 0 | Yes | Illegal | slave_circuits | Functions as Advanced Slave Circuits. Allows ship to be summoned via Comlink. Ship can lift off, fly to summoner, and land automatically (Untrained crew quality). |

### Damage Control

| Name | Cost | EP | Size Mult | Availability | Exclusive Group | Notes |
|---|---|---|---|---|---|---|
| Droid Repair Team | 5,000 | 1 | Yes | Common | - | Automatically deploys to repair a Starship when it moves -1 or more steps down the Condition Track. Makes a +13 Mechanics check to Jury-Rig (+1 step). 25% chance of destruction if damage > SR while active. |

### Docking

| Name | Cost | EP | Size Mult | Availability | Exclusive Group | Notes |
|---|---|---|---|---|---|---|
| Cotterdam | 3,000 | 1 | No | Common | - | Flexible tube connecting two Colossal+ ships. Creates tunnel 3 squares long. Maneuvering to connect requires DC 15 Pilot check. |
| Docking Clamp | 1,000 | 1 | No | Common | - | Used to carry smaller ships (e.g. TIE Fighters on a Gozanti). A Starship can maneuver and Hyperspace with ships attached. If ship takes damage > Threshold, clamped ships are shaken off. |

### Hangar

| Name | Cost | EP | Size Mult | Availability | Exclusive Group | Notes |
|---|---|---|---|---|---|---|
| Hangar Bay | 5,000 | 50 | Yes | Common | - | Holds secondary craft. Each bay has (Cost Modifier)/50 units of hangar space (Huge=1, Gargantuan=5, Colossal=20). Can be combined. |
| Hangar Bay, Concealed | 25,000 | 50 | Yes | Restricted | - | Functions as Hangar Bay but requires DC 30 Perception to notice externally. Launch/Land takes 2 Full-Round Actions. |

### Logistics

| Name | Cost | EP | Size Mult | Availability | Exclusive Group | Notes |
|---|---|---|---|---|---|---|
| Extended Range | 100 | 1 | Yes | Common | - | Improves a Starship's consumables by 10% of its original value (rounded down, minimum 1 day) x the number of times installed. |
| Fuel Converters | 2,400 | 1 | Yes | Common | - | Transform matter into usable Fuel. 1 hour gathering = 1 unit of fuel (1 day realspace / 1 jump). |

### Power

| Name | Cost | EP | Size Mult | Availability | Exclusive Group | Notes |
|---|---|---|---|---|---|---|
| Backup Battery | 10,000 | 1 | No | Common | - | Allows ship to operate for 1 hour after power failure. Can reverse ionization damage (DC 25 Mechanics) but drains battery. |

### Safety

| Name | Cost | EP | Size Mult | Availability | Exclusive Group | Notes |
|---|---|---|---|---|---|---|
| Cockpit Ejection System | 8,000 | 1 | No | Licensed | - | Allows cockpit to eject as an Escape Pod on ship destruction (DC 20 Pilot check to avoid damage). |
| Lifeboat, Large | 400 | 1 | Yes | Common | - | Provide life support for up to 50 Medium creatures for 2 months. Includes Class 15 Hyperdrive. Can be installed on ships of Colossal (Frigate) size or larger. |
| Lifeboat, Small | 400 | 1 | Yes | Common | - | Provide life support for up to 50 Medium creatures for 2 months. Includes Class 15 Hyperdrive. Can be installed on ships of Colossal (Frigate) size or larger. 1 Bay includes (Cost Mod)/100 Lifeboats. |

### Security

| Name | Cost | EP | Size Mult | Availability | Exclusive Group | Notes |
|---|---|---|---|---|---|---|
| Interrogation Chamber | 10,000 | 0 | No | Restricted | - | Converts a Holding Cell. Grants +5 Persuasion vs prisoners. Allows torture (+1 Dark Side). |

### Sensors

| Name | Cost | EP | Size Mult | Availability | Exclusive Group | Notes |
|---|---|---|---|---|---|---|
| Sensor Enhancement Package | 15,000 | 1 | Yes | Licensed | - | Superior sensors providing better detection. Grants +5 bonus on Perception and Use Computer checks made to Use Sensors. |

### Storage

| Name | Cost | EP | Size Mult | Availability | Exclusive Group | Notes |
|---|---|---|---|---|---|---|
| Cargo Jettison System | 1,500 | 1 | No | Common | - | Allows a ship to dump part or all of its cargo into space without docking or slowing down as a Swift Action. |
| Cargo Pod (Heavy) | 1,500 | 2 | Yes | Common | - | **Stats:** dex_bonus: -2, cargo_bonus_size_mult: 10<br>Additional storage space. Adds (Size Mod) x 10 tons of cargo. Reduces Dexterity by 2 (Min Dex 1). |
| Cargo Pod (Light) | 500 | 0 | Yes | Common | - | **Stats:** dex_bonus: -2, cargo_bonus_size_mult: 1<br>Additional storage space. Adds (Size Mod) x 1 tons of cargo. Reduces Dexterity by 2 (Min Dex 1). |
| Cargo Pod (Medium) | 1,000 | 1 | Yes | Common | - | **Stats:** dex_bonus: -2, cargo_bonus_size_mult: 5<br>Additional storage space. Adds (Size Mod) x 5 tons of cargo. Reduces Dexterity by 2 (Min Dex 1). |
| Hidden Cargo Hold (25%) | 2,000 | 1 | Yes | Illegal | - | **Stats:** hidden_cargo_pct: 0.25<br>Converts 25% of cargo space into hidden compartments (-5 to Perception checks to find). |
| Hidden Cargo Hold (50%) | 5,000 | 1 | Yes | Illegal | - | **Stats:** hidden_cargo_pct: 0.5<br>Converts 50% of cargo space into hidden compartments. |
| Hidden Cargo Hold (75%) | 10,000 | 1 | Yes | Illegal | - | **Stats:** hidden_cargo_pct: 0.75<br>Converts 75% of cargo space into hidden compartments. |
| Smuggler's Compartment | 1,000 | 1 | Yes | Illegal | - | Hidden cargo spaces. DC 30 Perception to find. Holds (Cost Mod) x 200 kg. Max 5% of total cargo capacity. |

## Weapon Systems

### Blaster Cannons

| Name | Cost | EP | Size Mult | Availability | Exclusive Group | Notes |
|---|---|---|---|---|---|---|
| Heavy Blaster Cannon (5d10x2) | 5,500 | 2 | No | Military | - | **Damage:** 5d10x2<br>Blaster Cannons are frequently mounted on Starfighters. They are less expensive than Laser Cannons but have a more limited range. |
| Light Blaster Cannon (3d10x2) | 1,200 | 1 | No | Licensed | - | **Damage:** 3d10x2<br>Blaster Cannons are frequently mounted on Starfighters. They are less expensive than Laser Cannons but have a more limited range. |
| Medium Blaster Cannon (4d10x2) | 2,500 | 1 | No | Restricted | - | **Damage:** 4d10x2<br>Blaster Cannons are frequently mounted on Starfighters. They are less expensive than Laser Cannons but have a more limited range. |

### Exotic Weapons

| Name | Cost | EP | Size Mult | Availability | Exclusive Group | Notes |
|---|---|---|---|---|---|---|
| Bomblet Generator | 5,000 | 2 | Yes | Military | - | **Damage:** 3d10x2<br>Automatically deploys a field of small explosives in adjacent squares. Any ship entering an adjacent square takes 3d10x2 Energy damage. Has infinite ammunition (energy based). |
| Chaff Gun | 1,000 | 1 | Yes | Restricted | - | Launches a cloud of sensor-confusing debris. Provides concealment and imposes a -5 penalty on attack rolls and Pilot checks for missiles and sensors attempting to target the ship. |
| Composite Beam Cannon | 3,000 | 1 | Yes | Military | - | **Damage:** 5d10x2<br>A laser weapon that ignores 5 points of the target's Shield Rating (treat SR as 5 lower against this attack). |
| Defoliator | 10,000 | 3 | Yes | Illegal | - | Biological weapon. Deals massive damage to organic crew but no damage to the ship structure. Illegal in all jurisdictions. |
| Discord Missile Launcher | 1,000 | 1 | Yes | Military | - | **Damage:** 2d10/turn<br>Deploys a buzz droid swarm on the target ship. The target takes 2d10 damage per turn (ignoring DR and SR) until the droids are removed or destroyed. Requires a successful attack roll to hit. |
| Docking Gun Mount | 1,000 | 1 | No | Common | - | Allows Character Scale Ranged Weapons to be added as a Docking Gun. Counts as Heavy Weapon. Draws power from ship. The cost is for the mount only - the gun itself is bought normally. Docking Guns have no effect on Starship Scale combat. |
| Flak Pod | 2,000 | 1 | Yes | Military | - | **Damage:** 3d10x2<br>Anti-fighter defense. Deals 3d10x2 damage to all starfighters in adjacent squares. |
| Gravity Mine Launcher | 5,000 | 2 | Yes | Military | - | **Damage:** 4d10x2<br>Detonates when a ship enters the square, creating a temporary gravity well that prevents Hyperspace travel for 1 round and deals 4d10x2 Energy damage. |
| Gravity Well Projector | 25,000 | 5 | Yes | Military | - | A Gravity Well Projector creates an artificial gravity well that prevents Hyperspace travel. Any Starship within 12 squares of an active Gravity Well Projector cannot activate its Hyperdrive. Additionally, any ship traveling through Hyperspace that passes within 12 squares of the active Gravity Well Projector is immediately pulled out of Hyperspace. |
| Harpoon Gun | 2,000 | 1 | No | Common | - | A Gunner may use the Harpoon Gun to make a Grapple check against a target Walker. If the Grapple check succeeds, the target Walker cannot move without first making a Pilot check (DC = Harpoon Gun's Grapple check result). If this Pilot check fails, the Walker suffers an automatic Collision, taking twice its Collision damage. |
| Heavy Mass-Driver Cannon | 15,000 | 2 | Yes | Military | - | **Damage:** 7d10x2<br>A heavy projectile weapon. Damage 7d10x2. |
| Ion Bomb Rack | 1,500 | 1 | Yes | Military | - | **Damage:** 4d10x2<br>Ion Bombs deal 4d10x2 Ion damage in a 2-square burst area. However, they are unguided weapons and take a -5 penalty on attack rolls against moving targets (speed > 0). |
| Ion Pulse Cannon | 4,000 | 1 | Yes | Military | - | **Damage:** 9d10x10<br>A massive ion weapon used on ships like the Subjugator. It fires a massive ion pulse that affects all ships in a large area, disabling electronics and shields. Requires a massive recharge time. |
| Mass-Driver Cannon | 3,500 | 1 | Yes | Military | - | **Damage:** 6d10x2<br>A projectile weapon. Damage 6d10x2. |
| Pressor Beam | 5,000 | 2 | Yes | Restricted | - | Reverse Tractor Beam. Pushes a target ship 1 square away on a successful hit. The target must be smaller than the firing ship. |
| Proton Grenade Launcher | 800 | 1 | Yes | Restricted | - | **Damage:** 8d6<br>Fires a cluster of proton grenades. Deals 3d10x2 Energy damage in a 1-square burst. Short range only. |
| Rail Cannon | 4,500 | 2 | Yes | Military | - | **Damage:** 5d10x5<br>Similar to Mass-Drivers but more powerful. Deals 5d10x2 Physical damage. Ignores SR. |
| Shieldbuster Torpedo Launcher | 2,000 | 1 | Yes | Military | - | **Damage:** 4d10x2<br>A specialized torpedo designed to overload shielding systems. On a hit, it reduces the target's Shield Rating by -10 (instead of the usual -5). Shields damaged in this way can be recharged normally. |
| Space Mine Launcher | 5,000 | 1 | Yes | Restricted | - | **Damage:** 6d10x2<br>Space Mines are stationary explosives deployed in space. If a ship enters a square containing a Space Mine, it detonates, dealing 6d10x2 Energy damage to that ship. |

### Ion Weapons

| Name | Cost | EP | Size Mult | Availability | Exclusive Group | Notes |
|---|---|---|---|---|---|---|
| Hapan Triple Ion Cannon (5d10x5) | 12,000 | 3 | No | Illegal | - | **Damage:** 5d10x5<br>Acts like a Point-Defense Weapon (no penalty for targets smaller than Colossal). Capable of Autofire, but not Starship Scale Area Attacks. Illegal outside Hapan Consortium. |
| Heavy Ion Cannon (3d10x5) | 6,000 | 5 | No | Military | - | **Damage:** 3d10x5<br>Ion Cannons deal Ion damage. Most Starship-mounted Ion Cannons do not have a high enough rate of fire for Autofire. |
| Light Ion Cannon (3d10x2) | 2,000 | 1 | No | Licensed | - | **Damage:** 3d10x2<br>Ion Cannons deal Ion damage. Starship-mounted Ion Cannons are generally defense armament. |
| Medium Ion Cannon (5d10x2) | 3,000 | 2 | No | Restricted | - | **Damage:** 5d10x2<br>Ion Cannons deal Ion damage. Most Starship-mounted Ion Cannons do not have a high enough rate of fire for Autofire. |

### Laser Cannons

| Name | Cost | EP | Size Mult | Availability | Exclusive Group | Notes |
|---|---|---|---|---|---|---|
| Heavy Laser Cannon (5d10x2) | 6,000 | 2 | No | Military | - | **Damage:** 5d10x2<br>Laser Cannons are the most common Starship weapons. They generally have better Range than Blaster Cannons but are somewhat more expensive. |
| Light Laser Cannon (3d10x2) | 1,500 | 1 | No | Licensed | - | **Damage:** 3d10x2<br>Laser Cannons are the most common Starship weapons. They generally have better Range than Blaster Cannons but are somewhat more expensive. |
| Medium Laser Cannon (4d10x2) | 4,000 | 1 | No | Restricted | - | **Damage:** 4d10x2<br>Laser Cannons are the most common Starship weapons. They generally have better Range than Blaster Cannons but are somewhat more expensive. |

### Launchers

| Name | Cost | EP | Size Mult | Availability | Exclusive Group | Notes |
|---|---|---|---|---|---|---|
| Heavy Concussion Missile Launcher (9d10x5) | 30,000 | 20 | No | Military | - | **Damage:** 9d10x5<br>Base Capacity: 30 missiles. Additional capacity costs +20% per missile (max double capacity). |
| Heavy Ordnance Launcher | 10,000 | 2 | Yes | Military | - | **Damage:** 5d10x5<br>Launches heavy ordnance payloads. |
| Light Concussion Missile Launcher (7d10x2) | 2,000 | 2 | No | Military | - | **Damage:** 7d10x2<br>Base Capacity: 6 missiles. Additional capacity costs +20% per missile (max double capacity). |
| Medium Concussion Missile Launcher (9d10x2) | 3,500 | 5 | No | Military | - | **Damage:** 9d10x2<br>Base Capacity: 16 missiles. Additional capacity costs +20% per missile (max double capacity). |
| Proton Torpedo Launcher | 2,500 | 1 | No | Restricted | - | **Damage:** 9d10x2<br>Base Capacity: 3 torpedoes. Additional capacity costs +25% per torpedo (max 16). |

### Mounts

| Name | Cost | EP | Size Mult | Availability | Exclusive Group | Notes |
|---|---|---|---|---|---|---|
| Hardpoint (x4) | 500 | 0 | No | Common | - | External mounts for missiles/bombs. 1 Array = 4 Hardpoints. 1 Missile/Bomb = 1 HP (2 for Colossal weapons). Can also carry Drop Tanks. Half payload lost if Condition Track drops. |

### Tactical

| Name | Cost | EP | Size Mult | Availability | Exclusive Group | Notes |
|---|---|---|---|---|---|---|
| Grappler Mag | 1,000 | 1 | No | Common | - | Short-range grappling hook (Range 1). Can be used without power to attach clandestinely (Opposed Pilot/Stealth vs Pilot/Use Computer). |
| Plasma Punch | 25,000 | 2 | No | Military | - | Bores through hull to create airlocks. Halves target DR for drilling time. Functions like Plasma Torch but faster and doesn't require Tractor Clamp. |
| Plasma Torch | 6,000 | 0 | No | Military | - | Modification for Tractor Clamp. Cuts hole in secured ship's hull. 1 round per point of DR. Deal 1d6 damage per round to ship. |
| Tractor Beam | 10,000 | 10 | No | Common | - | Tractor Beams prevent another Vehicle from escaping instead of dealing damage. If the attack hits, make an opposed Grapple check. Smaller targets are immobilized and lose Dex bonus. Larger targets can be pulled closer. Docking Clamps allow boarding. |
| Tractor Clamp | 15,000 | 12 | No | Common | - | Secures enemy ships for boarding. +5 Grapple bonus to maintain hold. Includes boarding tube. Can equip Plasma Torch. |

### Turbolasers

| Name | Cost | EP | Size Mult | Availability | Exclusive Group | Notes |
|---|---|---|---|---|---|---|
| Heavy Turbolaser (7d10x5) | 20,000 | 10 | No | Military | - | **Damage:** 7d10x5<br>Turbolasers require immense power and cooling. Most Turbolasers are incapable of Autofire due to longer firing sequences. |
| Light Turbolaser (3d10x5) | 5,000 | 2 | No | Military | - | **Damage:** 3d10x5<br>Turbolasers require immense power and cooling. Light Turbolasers can be Fire-Linked with Autofire. |
| Medium Turbolaser (5d10x5) | 10,000 | 5 | No | Military | - | **Damage:** 5d10x5<br>Turbolasers require immense power and cooling. Most Turbolasers are incapable of Autofire due to longer firing sequences. |
