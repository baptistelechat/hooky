param(
    [Parameter(Mandatory=$true)][string]$EventName,
    [string]$ToolName = "",
    [string]$SessionId = "screenshot-demo"
)
$body = @{ session_id = $SessionId; hook_event_name = $EventName }
if ($ToolName) { $body.tool_name = $ToolName }
Invoke-RestMethod -Uri "http://127.0.0.1:4242/event" -Method Post -Body ($body | ConvertTo-Json) -ContentType "application/json" | Out-Null
Write-Output "sent: $EventName $ToolName"
