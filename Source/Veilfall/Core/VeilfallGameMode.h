#pragma once

#include "CoreMinimal.h"
#include "GameFramework/GameModeBase.h"
#include "VeilfallGameMode.generated.h"

/**
 * Base game mode. Make BP_VeilfallGameMode from this and set the player
 * character there once it exists (Phase 2). Until then the default pawn
 * lets you fly around test maps.
 */
UCLASS()
class VEILFALL_API AVeilfallGameMode : public AGameModeBase
{
	GENERATED_BODY()

public:
	AVeilfallGameMode();
};
