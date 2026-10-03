#include "Input/VeilfallInputConfig.h"
#include "Veilfall.h"

const UInputAction* UVeilfallInputConfig::FindInputActionForTag(const FGameplayTag& InputTag, bool bLogNotFound) const
{
	for (const FVeilfallInputAction& Action : InputActions)
	{
		if (Action.InputAction && Action.InputTag == InputTag)
		{
			return Action.InputAction;
		}
	}

	if (bLogNotFound)
	{
		UE_LOG(LogVeilfall, Warning, TEXT("No input action for tag [%s] in input config [%s]."), *InputTag.ToString(), *GetNameSafe(this));
	}
	return nullptr;
}
