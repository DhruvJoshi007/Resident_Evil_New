#include "Core/VeilfallPlayerController.h"
#include "Veilfall.h"
#include "EnhancedInputSubsystems.h"
#include "Engine/LocalPlayer.h"
#include "InputMappingContext.h"
#include "Input/VeilfallInputConfig.h"

const UVeilfallInputConfig* AVeilfallPlayerController::GetInputConfig() const
{
	return InputConfig;
}

void AVeilfallPlayerController::BeginPlay()
{
	Super::BeginPlay();

	if (!IsLocalController())
	{
		return;
	}

	if (!DefaultMappingContext)
	{
		UE_LOG(LogVeilfall, Warning, TEXT("%s has no DefaultMappingContext set. Assign IMC_Default in the Blueprint."), *GetNameSafe(this));
		return;
	}

	if (UEnhancedInputLocalPlayerSubsystem* Subsystem = ULocalPlayer::GetSubsystem<UEnhancedInputLocalPlayerSubsystem>(GetLocalPlayer()))
	{
		Subsystem->AddMappingContext(DefaultMappingContext, DefaultMappingPriority);
	}
}
