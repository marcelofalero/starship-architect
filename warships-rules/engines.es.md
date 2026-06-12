+++
title = "motores"
description = "Paso 4 de la construcción de la nave estelar."
weight = 31
+++



### Table 5-4: Engines

| Engine | Tech | Pow | Min Size | Base Cost. | Cost/Hull | Accel @ 5% | @ 10% | @ 15% | @ 20% | @ 30% | @ 40% | @ 50% | Eff. | Cost |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Planetary thruster | - | 1.0 | 1 | $200 K | $50 K | 0.1* | 0.25* | 0.5* | 1* | - | - | - | 10 | $10 K |
| Photon sail | - | - | 5 | $500 K | $50 K | -- | 0.02* | 0.05* | 0.1* | 0.15* | 0.2* | 0.25* | - | - |
| Fusion torch | - | 0.33 | 3 | $500 K | $100 K | 0.5* | 1* | 1.5* | 2* | 3* | 4* | 5* | 200 | $1 K |
| Ion engine | S | 0.5 | 2 | $800 K | $200 K | -- | 0.5* | 1* | 1.5* | 2* | 3* | 4* | 400 | $5 K |
| Particle impulse | - | 0.75 | 4 | $500 K | $300 K | 0.5 | 1.0 | 1.5 | 2 | 2.5 | 3 | 4 | - | - |
| Induction engine | G | 1.0 | 2 | $1 M | $500 K | 1 | 2 | 3 | 4 | 5 | 6 | 8 | - | - |
| Inertial flux engine | X | 1.0 | 1 | $2 M | $500 K | 2 | 3 | 4 | 5 | 6 | 8 | 10 | - | - |
| Gravitic redirector | G | 0.67 | 3 | $3 M | $1 M | 2 | 4 | 6 | 8 | 10 | 12 | 16 | - | - |
| Spatial compressor | T | 2.0 | 4 | $1.5 M | $200 K | 3 | 6 | 9 | 12 | 15 | 18 | 20 | - | - |

**Tech**: The technology type required to build an engine of this type.
**Power**: The number of power points required by each hull point assigned to this engine. For example, a 30-hull point fusion torch requires 10 power points to operate.
**Min Size**: The smallest number of hull points that can be assigned to this system.
**Base Cost**: The cost for an engine installation of this type.
**Cost/Hull**: The cost per hull point assigned to this engine; cumulative with the base cost.
**Acceleration rating at...**: The ship’s acceleration for an installation comprising 5-50% of its overall hull. For example, a ship of 100 hull points with 20 hull points of induction engine possesses an acceleration of 4.
**Eff.**: The fuel efficiency of the engine. A single hull point devoted to fuel powers a 1-hull point engine for this many days of continuous operation.
**Cost**: The cost per hull point devoted to fuel for this type of engine.

### Engine System Descriptions

Not all engines are created equal. Low-tech engines may take hours, days, or weeks of continuous acceleration to build up to a speed that a high-tech engine can match in a matter of two or three phases. When you select an engine system for your starship, record the engine’s acceleration rating on your ship record sheet and assign the engines to one or more hit locations. See the later part of the chapter for more information.

**Photon Sail (PL 6)**
This device is an immense but incredibly fragile foil structure only a few molecules thick. It uses light pressure from a nearby star or laser drive station for its motive force. Its acceleration rates drop by 50% if the ship is more than 5 AU distant from the system’s star. 

The sail can be wrecked by the most minor damage, but every ship equipped with a photon sail carries at least three spares. Unfortunately, it takes hours to stow or deploy a sail.

| Crew Check | Crit. Failure | Failure | Ordinary | Good | Amazing |
|---|---|---|---|---|---|
| Deployment | d4+1 days | 3d4 hours | 2d4 hours | 1d4 hours | 1 hour |

In combat, any weapon hit destroys a deployed photon sail and prevents the sail-ship from making maneuvers until the sail can be re-deployed. The sail-ship will continue on its last course and retain its former speed until it gets a working sail again. Since ships powered exclusively by sails can’t change course easily, assume that all sail-ships are Class I maneuverability. 

It’s a good idea for a sail-ship to carry a secondary propulsion system such as a small ion engine or rocket for emergency maneuvering and sailing against the sun. Photon sails are completely useless in atmosphere—in fact, they’re instantly destroyed by atmospheric entry. Most sail-ships carry a small back-up propulsion system for fine maneuvering.

**Planetary Thruster (PL 6)**
Several PL 6 engine systems are useless or dangerous in any kind of atmosphere. The planetary thruster is a backup engine system designed specifically for use when the ship’s main drives must be shut down to make planetfall. The most common varieties are the scramjet, chemical rocket, or powered airfoil. The exact form doesn’t matter. The planetary thruster requires either fuel or power, but not both. You can choose to install a standard fuel tank, or to make sure that the ship has enough power available to run a planetary thruster at need.

**Fusion Torch (PL 6)**
This engine is basically a fusion reactor with one wall of the magnetic bottle missing; the exhaust is incredibly hot plasma. The fusion torch is intended for space-only work; its exhaust stream would slag anything it landed on and incinerate everything within a few hundred meters of ground zero. Many ships fitted with fusion rockets carry planetary thrusters for atmospheric work, or remain permanently in space, using shuttlecraft to reach a planet’s surface. Its fuel is hydrogen, fused in the reaction chamber and expelled as white-hot plasma.

**Ion Engine (PL 6)**
The ion engine uses power to break down molecules of a fuel material to create ions, and then expels them by means of a magnetic impeller. It doesn’t provide the thrust potential of the fusion torch, but it’s much more fuel efficient, and its exhaust is not anywhere near as dangerous. Ion engines don’t function in any kind of atmosphere, so most ships with this kind of power plant also carry a planetary thruster.

**Particle Impulse Engine (PL 7)**
This is simply an improved version of the PL 6 ion engine. The particle impulse drive uses magnetic fields to produce a constant stream of high-energy particles and vector it for thrust. Unlike the ion engine, the particle impulse engine doesn’t require a fuel tank. Its reaction is so efficient that the very small amount of matter present in interplanetary or interstellar space can be collected through weak magnetic fields and converted into a thrust medium.
The particle impulse engine is capable of atmospheric entry. It causes some damage to any surface close to its exhaust ports, but it’s not too much worse than a modernday jetwash.

> **Design Tip: Engines**
> An engine of 10 to 20 percent of your hull is pretty reasonable. Anything more than that is going to be nearly impossible to design around, unless you’re building a special fast courier with minimal armament and amenities for the crew.

**Induction Engine (PL 7)**
Hands-down the best engine available at this or any previous Progress Level, the induction engine uses artificial gravity to provide incredible thrust and maneuverability. The induction engine requires no fuel and produces no exhaust; it’s ideal for atmospheric, orbital, or deep-space work.

**Inertial Flux Engine (PL 8)**
By precisely controlling the quantum energy level of every atom on the ship simultaneously, the inertial flux engine assumes the inertial states necessary to produce motion in any direction. In effect, the pilot chooses from instant to instant what vector the ship will next possess, and the inertial flux engine makes it possible. This engine requires no fuel and is safe for atmospheric work.

**Gravitic Redirector (PL 8)**
A refinement of the induction engine, the gravitic redirector changes the ambient gravity in the vicinity of the ship to produce a motive force. It’s more powerful and more efficient than the induction engine.

**Spatial Compressor (PL 9)**
One of the most advanced engines available, the spatial compressor surrounds the ship in a field that “folds” or “wrinkles” the structure of space in the direction the pilot wishes to travel. This results in a continuous series of micro-jumps in which the ship flickers into and out of reality, teleporting thousands of times every second. 

Since the ship has no intrinsic velocity (it’s stationary while it teleports) the spatial compressor can instantaneously stop or change direction and thrust vector without any maneuvering whatsoever. However, the engine still needs to build up cyclic speed to increase the frequency of its microjumps, so it accelerates normally.
The spatial compressor requires a lot of power, but no fuel. It’s safe for atmospheric flight.

## Step 5: FTL Drive

The term ‘FTL’ stands for faster-than-light. A ship’s FTL drive is the engine system that allows it to break out of the Einsteinian universe and travel at speeds that make interstellar travel easy. With an FTL drive, a ship can make a trip of many years at sub-light speeds into a voyage of months, weeks, days, or perhaps even hours. 

Obviously, not every ship needs to be equipped with an FTL drive. In fact, the expense of most FTL systems means that only the ships that need FTL capability will be built with it, even when technology advances to the point of commonplace interstellar commerce.
Ships with no FTL drive may still enjoy access to FTL travel; it’s possible for a large ship with an FTL drive to tow or carry a sub-light ship. See “Miscellaneous Installations” for information on docking clamps.

**Jump Drive (PL 6)**
The jump drive relies on a fairly rare technology type, the technology of matter transmission. It requires an enormous amount of power, so much so that the jump drive itself is a colossal fusion device that derives the power for its jump by annihilating massive amounts of hydrogen fuel for a single jump. Thus, the jump drive only requires 5 percent of the ship’s hull points, but it must be built with a fuel tank that may account for anywhere from another 5 to 50 percent of the ship’s hull. A small amount of shipboard power (1 power point per hull point devoted to the jump drive machinery) is also required to control the machinery and direct the jump.
The distance a jump drive can teleport in one jump depends on how much of the ship’s mass (i.e., hull points) is annihilated for the jump. For example, a jump ship of 200 hull points might have fuel tanks with a capacity of 60 hull points of fuel—30 percent of the ship’s hull. It could eliminate 10 hull points of fuel (5 percent of the hull) for a jump of 1 light-year, or it could eliminate all 60 fuel points for a jump of 6 light-years.
Since most jump ships use most or all of their available fuel in a jump, they need to jump to a point at which they can refuel their tanks. Obviously, a civilized system will have fueling capability, but if fuel can’t be purchased, the jump ship must improvise. Hydrogen can be skimmed from gas giants, separated from water, or mined in the form of ice. Assuming that a suitable source of hydrogen is available, you can assume that a ship requires 1 full day of fueling per 10 hull points of fuel collected. See “Miscellaneous Installations.”
The jump drive can execute a jump anytime it has enough fuel to do so. It takes 1d4 hours to cycle the engine and plot the next jump point, so there’s usually a small delay between jumps even if fuel is immediately available.

**Wormhole Screen (PL 6)**
It’s theoretically possible for an object such as a ship to pass through a wormhole—a tunnel in space produced by a spectacular event such as the creation of a black hole—and emerge dozens, hundreds, or thousands of light-years from its previous location. However, the simple act of passing through a wormhole triggers its collapse, which makes it difficult to use a wormhole as a means of interstellar travel. The wormhole screen masks the starship’s mass from the wormhole, thus keeping the conduit open long enough for the ship to pass from one end to the other. It also protects the ship from the extreme conditions in the vicinity of the wormhole.
The wormhole screen only allows transit along a naturally occurring wormhole, which means that a ship can’t pick its destination; it has to go wherever the wormhole takes it. (In some campaigns, networks of pre-existing artificial wormholes may make it possible to reach a great number of stars in this fashion.) The screen device requires 5 percent of the ship’s hull points, and 2 power points per hull point devoted to the system. 

A ship of 800 hull points must spend 40 hull points on the screen, and a total of 80 power points to energize the device. Entering a wormhole is a dicey proposition at best, so it takes 2d4 hours to perform the course calculations and maneuvering necessary to initiate a wormhole transit once the ship is in the vicinity of the next wormhole it intends to jump through.

**Gate Activator (PL 7)**
This device simply keys a gate device of some kind, which functions as a huge teleporter to another gate somewhere else. It doesn’t require very much power compared to other FTL drives because most of the work is done by the gate itself. The gate activator requires 1 percent of the ship’s hull points (1 hull point per 100 hull points of the ship), and 2 power points per hull point allocated to the system. 

The ship transiting the gate automatically arrives at the other terminus and cannot jump to a place where no gate exists. The length of the transit may be instantaneous, or it could last for several hours; it depends on the GM’s campaign. A gate device usually requires some cycle time to amass the incredible energies needed to fling a ship across interstellar distances. Again, this is up to the GM, but a period of 2d4 hours as a minimum cycle time is reasonable.

**Hyperdrive (PL 7)**
This drive system hurls the ship into an alternate dimension or reality in which the lightspeed limit is meaningless. As with the jump drive, it’s necessary to calculate a destination before entering hyperspace. This requires 1d4 (x) 10 minutes, or a Navigation skill check (complex skill check of 4 successes at no penalty, 10 minutes per check). Once the ship is engaged in a hyperspace jump, it can’t change course. It can drop out of hyperspace at any time simply by disengaging the hyperdrive, and there may be devices or natural phenomena that bar hyperspace travel and interdict any ship passing through the vicinity.
