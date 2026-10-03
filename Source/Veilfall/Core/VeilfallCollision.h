// Custom trace channels and physical surfaces.
// These must stay in sync with Config/DefaultEngine.ini.

#pragma once

#include "Engine/EngineTypes.h"

// Trace channels
#define ECC_Weapon       ECC_GameTraceChannel1	// Bullets and melee traces
#define ECC_Interaction  ECC_GameTraceChannel2	// Doors, pickups, puzzles, crates
#define ECC_AIVisibility ECC_GameTraceChannel3	// AI line-of-sight checks

// Physical surfaces, used for footsteps, bullet impacts and damage multipliers
#define SurfaceType_Concrete  SurfaceType1
#define SurfaceType_Wood      SurfaceType2
#define SurfaceType_Metal     SurfaceType3
#define SurfaceType_Flesh     SurfaceType4
#define SurfaceType_Water     SurfaceType5
#define SurfaceType_Tile      SurfaceType6
#define SurfaceType_Glass     SurfaceType7
#define SurfaceType_Dirt      SurfaceType8
#define SurfaceType_Carpet    SurfaceType9
#define SurfaceType_Gravel    SurfaceType10
#define SurfaceType_FleshHead SurfaceType11
