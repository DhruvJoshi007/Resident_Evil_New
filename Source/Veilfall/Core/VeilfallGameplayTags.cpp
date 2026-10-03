#include "Core/VeilfallGameplayTags.h"

namespace VeilfallTags
{
	UE_DEFINE_GAMEPLAY_TAG_COMMENT(InputTag_Move,         "InputTag.Move",         "Move (2D axis)");
	UE_DEFINE_GAMEPLAY_TAG_COMMENT(InputTag_Look,         "InputTag.Look",         "Look (2D axis)");
	UE_DEFINE_GAMEPLAY_TAG_COMMENT(InputTag_Sprint,       "InputTag.Sprint",       "Sprint (hold)");
	UE_DEFINE_GAMEPLAY_TAG_COMMENT(InputTag_Crouch,       "InputTag.Crouch",       "Crouch (toggle)");
	UE_DEFINE_GAMEPLAY_TAG_COMMENT(InputTag_Aim,          "InputTag.Aim",          "Aim weapon (hold)");
	UE_DEFINE_GAMEPLAY_TAG_COMMENT(InputTag_Fire,         "InputTag.Fire",         "Fire weapon");
	UE_DEFINE_GAMEPLAY_TAG_COMMENT(InputTag_Reload,       "InputTag.Reload",       "Reload weapon");
	UE_DEFINE_GAMEPLAY_TAG_COMMENT(InputTag_Interact,     "InputTag.Interact",     "Interact, pick up, open");
	UE_DEFINE_GAMEPLAY_TAG_COMMENT(InputTag_Dodge,        "InputTag.Dodge",        "Dodge or shove");
	UE_DEFINE_GAMEPLAY_TAG_COMMENT(InputTag_Knife,        "InputTag.Knife",        "Knife attack or parry");
	UE_DEFINE_GAMEPLAY_TAG_COMMENT(InputTag_QuickTurn,    "InputTag.QuickTurn",    "180 degree quick turn");
	UE_DEFINE_GAMEPLAY_TAG_COMMENT(InputTag_ShoulderSwap, "InputTag.ShoulderSwap", "Swap camera shoulder");
	UE_DEFINE_GAMEPLAY_TAG_COMMENT(InputTag_Flashlight,   "InputTag.Flashlight",   "Toggle flashlight");
	UE_DEFINE_GAMEPLAY_TAG_COMMENT(InputTag_Inventory,    "InputTag.Inventory",    "Open inventory");
	UE_DEFINE_GAMEPLAY_TAG_COMMENT(InputTag_Map,          "InputTag.Map",          "Open map");
	UE_DEFINE_GAMEPLAY_TAG_COMMENT(InputTag_Pause,        "InputTag.Pause",        "Pause menu");

	UE_DEFINE_GAMEPLAY_TAG_COMMENT(Health_State_Fine,     "Health.State.Fine",     "Above 66% health: full speed, steady aim");
	UE_DEFINE_GAMEPLAY_TAG_COMMENT(Health_State_Caution,  "Health.State.Caution",  "33-66% health: slower sprint, more sway");
	UE_DEFINE_GAMEPLAY_TAG_COMMENT(Health_State_Danger,   "Health.State.Danger",   "Below 33% health: limp, no sprint");
	UE_DEFINE_GAMEPLAY_TAG_COMMENT(Health_State_Dead,     "Health.State.Dead",     "Dead");

	UE_DEFINE_GAMEPLAY_TAG_COMMENT(Injury_Leg,            "Injury.Leg",            "Limp, no vault, slower climb");
	UE_DEFINE_GAMEPLAY_TAG_COMMENT(Injury_Arm,            "Injury.Arm",            "Slower reload, more recoil");
	UE_DEFINE_GAMEPLAY_TAG_COMMENT(Injury_Bleeding,       "Injury.Bleeding",       "Health drains, leaves a blood trail");
	UE_DEFINE_GAMEPLAY_TAG_COMMENT(Injury_Poisoned,       "Injury.Poisoned",       "Health drains, screen tint");
	UE_DEFINE_GAMEPLAY_TAG_COMMENT(Injury_Grabbed,        "Injury.Grabbed",        "Held by an enemy");

	UE_DEFINE_GAMEPLAY_TAG_COMMENT(State_Sprinting,       "State.Sprinting",       "Player is sprinting");
	UE_DEFINE_GAMEPLAY_TAG_COMMENT(State_Crouching,       "State.Crouching",       "Player is crouching");
	UE_DEFINE_GAMEPLAY_TAG_COMMENT(State_Aiming,          "State.Aiming",          "Player is aiming");
	UE_DEFINE_GAMEPLAY_TAG_COMMENT(State_Reloading,       "State.Reloading",       "Player is reloading");
	UE_DEFINE_GAMEPLAY_TAG_COMMENT(State_Healing,         "State.Healing",         "Player is using a healing item");
	UE_DEFINE_GAMEPLAY_TAG_COMMENT(State_Hidden,          "State.Hidden",          "Player is inside a hiding spot");
	UE_DEFINE_GAMEPLAY_TAG_COMMENT(State_InCutscene,      "State.InCutscene",      "A cutscene is playing");
}
