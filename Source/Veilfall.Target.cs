using UnrealBuildTool;

public class VeilfallTarget : TargetRules
{
	public VeilfallTarget(TargetInfo Target) : base(Target)
	{
		Type = TargetType.Game;
		DefaultBuildSettings = BuildSettingsVersion.Latest;
		IncludeOrderVersion = EngineIncludeOrderVersion.Latest;
		ExtraModuleNames.Add("Veilfall");
	}
}
