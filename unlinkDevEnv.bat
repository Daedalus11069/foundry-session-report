@echo off
set "TARGET=%localappdata%\FoundryVTT\Data\modules\session-report"

if exist "%TARGET%" (
	rmdir "%TARGET%"
) else (
	echo Directory "%TARGET%" does not exist.
)