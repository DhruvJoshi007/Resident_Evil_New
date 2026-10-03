#pragma once

#include "CoreMinimal.h"
#include "Engine/GameInstance.h"
#include "VeilfallGameInstance.generated.h"

class UVeilfallChapterData;

/** Lives for the whole session. Tracks the current chapter and moves between chapters. */
UCLASS()
class VEILFALL_API UVeilfallGameInstance : public UGameInstance
{
	GENERATED_BODY()

public:
	/** Opens the chapter's map and makes it the current chapter. */
	UFUNCTION(BlueprintCallable, Category = "Veilfall|Chapters")
	void StartChapter(UVeilfallChapterData* Chapter);

	/** Called after the escape cutscene. Returns false when there is no next chapter (game complete). */
	UFUNCTION(BlueprintCallable, Category = "Veilfall|Chapters")
	bool AdvanceToNextChapter();

	UFUNCTION(BlueprintPure, Category = "Veilfall|Chapters")
	UVeilfallChapterData* GetCurrentChapter() const;

private:
	UPROPERTY(Transient)
	TObjectPtr<UVeilfallChapterData> CurrentChapter;
};
