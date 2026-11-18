@echo off
set "TARGET=G:\herd\www\foundry-vtt-server-data\Data\modules\session-report"

if exist "%TARGET%" (
	rmdir "%TARGET%"
) else (
	echo Directory "%TARGET%" does not exist.
)