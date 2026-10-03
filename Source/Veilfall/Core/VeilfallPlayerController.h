#pragma once

#include "CoreMinimal.h"
#include "GameFramework/PlayerController.h"
#include "VeilfallPlayerController.generated.h"

class UInputMappingContext;
class UVeilfallInputConfig;

/** Adds the default Enhanced Input mapping context for the local player. */
UCLASS()
class VEILFALL_API AVeilfallPlayerController : public APlayerController
{
	GENERATED_BODY()

public:
	const UVeilfallInputConfig* GetInputConfig() const;

protected:
	virtual void BeginPlay() override;

	/** IMC_Default: keyboard, mouse and gamepad bindings. */
	UPROPERTY(EditDefaultsOnly, Category = "Input")
	TObjectPtr<UInputMappingContext> DefaultMappingContext;

	UPROPERTY(EditDefaultsOnly, Category = "Input")
	int32 DefaultMappingPriority = 0;

	/** DA_InputConfig: tag-to-action table the character binds from. */
	UPROPERTY(EditDefaultsOnly, Category = "Input")
	TObjectPtr<UVeilfallInputConfig> InputConfig;
};
