// One asset per chapter (DA_Chapter01 ... DA_Chapter05, and later chapters).
// Adding a chapter means adding a map and one of these assets, not new code.

#pragma once

#include "CoreMinimal.h"
#include "Engine/DataAsset.h"
#include "VeilfallChapterData.generated.h"

UCLASS(BlueprintType)
class VEILFALL_API UVeilfallChapterData : public UPrimaryDataAsset
{
	GENERATED_BODY()

public:
	/** Primary asset type, scanned from /Game/Veilfall/Data/Chapters (see DefaultGame.ini). */
	static const FPrimaryAssetType ChapterAssetType;

	virtual FPrimaryAssetId GetPrimaryAssetId() const override;

	/** 1-based chapter number shown on the title card. */
	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Chapter", Meta = (ClampMin = "1"))
	int32 ChapterNumber = 1;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Chapter")
	FText Title;

	/** Location shown under the title, e.g. "Harrow Bay Police Precinct". */
	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Chapter")
	FText LocationName;

	/** The level that holds this chapter. */
	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Chapter")
	TSoftObjectPtr<UWorld> Map;

	/** The chapter that follows the escape route. Empty for the final chapter. */
	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Chapter")
	TSoftObjectPtr<UVeilfallChapterData> NextChapter;

	/** Design target, used by playtest reports. */
	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Chapter", Meta = (ClampMin = "1"))
	float TargetPlayMinutes = 25.f;
};
