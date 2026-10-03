using UnrealBuildTool;

public class VeilfallEditorTarget : TargetRules
{
	public VeilfallEditorTarget(TargetInfo Target) : base(Target)
	{
		Type = TargetType.Editor;
		DefaultBuildSettings = BuildSettingsVersion.Latest;
		IncludeOrderVersion = EngineIncludeOrderVersion.Latest;
		ExtraModuleNames.Add("Veilfall");
	}
}
