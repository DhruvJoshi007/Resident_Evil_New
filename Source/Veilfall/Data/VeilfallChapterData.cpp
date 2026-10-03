#include "Data/VeilfallChapterData.h"

const FPrimaryAssetType UVeilfallChapterData::ChapterAssetType(FName(TEXT("VeilfallChapter")));

FPrimaryAssetId UVeilfallChapterData::GetPrimaryAssetId() const
{
	return FPrimaryAssetId(ChapterAssetType, GetFName());
}
