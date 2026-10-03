#include "Core/VeilfallGameMode.h"
#include "Core/VeilfallPlayerController.h"

AVeilfallGameMode::AVeilfallGameMode()
{
	PlayerControllerClass = AVeilfallPlayerController::StaticClass();
}
