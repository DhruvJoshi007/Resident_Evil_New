#include "Core/VeilfallGameInstance.h"
#include "Veilfall.h"
#include "Data/VeilfallChapterData.h"
#include "Kismet/GameplayStatics.h"

void UVeilfallGameInstance::StartChapter(UVeilfallChapterData* Chapter)
{
	if (!Chapter || Chapter->Map.IsNull())
	{
		UE_LOG(LogVeilfall, Error, TEXT("StartChapter: chapter [%s] is missing or has no map."), *GetNameSafe(Chapter));
		return;
	}

	CurrentChapter = Chapter;
	UE_LOG(LogVeilfall, Log, TEXT("Starting chapter %d: %s"), Chapter->ChapterNumber, *Chapter->Title.ToString());
	UGameplayStatics::OpenLevelBySoftObjectPtr(this, Chapter->Map);
}

UVeilfallChapterData* UVeilfallGameInstance::GetCurrentChapter() const
{
	return CurrentChapter;
}

bool UVeilfallGameInstance::AdvanceToNextChapter()
{
	if (!CurrentChapter || CurrentChapter->NextChapter.IsNull())
	{
		return false;
	}

	UVeilfallChapterData* Next = CurrentChapter->NextChapter.LoadSynchronous();
	if (!Next)
	{
		UE_LOG(LogVeilfall, Error, TEXT("AdvanceToNextChapter: could not load next chapter after [%s]."), *GetNameSafe(CurrentChapter));
		return false;
	}

	StartChapter(Next);
	return true;
}
