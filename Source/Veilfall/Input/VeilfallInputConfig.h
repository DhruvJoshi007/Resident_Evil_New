// Maps gameplay tags to Enhanced Input actions so code binds by tag,
// not by hard-coded asset references. One asset: DA_InputConfig.

#pragma once

#include "CoreMinimal.h"
#include "Engine/DataAsset.h"
#include "GameplayTagContainer.h"
#include "VeilfallInputConfig.generated.h"

class UInputAction;

USTRUCT(BlueprintType)
struct FVeilfallInputAction
{
	GENERATED_BODY()

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly)
	TObjectPtr<const UInputAction> InputAction = nullptr;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Meta = (Categories = "InputTag"))
	FGameplayTag InputTag;
};

UCLASS(BlueprintType, Const)
class VEILFALL_API UVeilfallInputConfig : public UDataAsset
{
	GENERATED_BODY()

public:
	/** Returns the action bound to InputTag, or nullptr if none is set. */
	UFUNCTION(BlueprintCallable, Category = "Veilfall|Input")
	const UInputAction* FindInputActionForTag(const FGameplayTag& InputTag, bool bLogNotFound = true) const;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Meta = (TitleProperty = "InputTag"))
	TArray<FVeilfallInputAction> InputActions;
};
