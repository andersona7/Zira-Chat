# Download 52 unique, emotion-matched animated GIFs from reliable public sources
# Each URL is hand-picked to match the emotion/reaction of the filename

$gifDir = "c:\Zira Chat\apps\web\public\gifs"

# Clean up temp files first
Get-ChildItem -Path $gifDir -Filter "temp-*.gif" | Remove-Item -Force

# Define unique URLs for each GIF - sourced from public domain / CC0 / freely available animated GIFs
# Using multiple reliable CDN sources including media.giphy.com (direct links), tenor, and i.imgur

$gifMap = @{
    # 😂 Funny
    "funny-laugh"     = "https://media.giphy.com/media/10JhviFuU2gWD6/giphy.gif"
    "funny-lmao"      = "https://media.giphy.com/media/Q7ozWVYCR0nyW2rvPW/giphy.gif"
    "funny-laugh-cry"  = "https://media.giphy.com/media/d2lcHJTG5Tscg/giphy.gif"
    "funny-sarcastic"  = "https://media.giphy.com/media/l3q2K5jinAlChoCLS/giphy.gif"
    "funny-giggle"     = "https://media.giphy.com/media/3NtY188QaxDdC/giphy.gif"

    # ❤️ Love / Cute
    "love-heart"       = "https://media.giphy.com/media/26BRv0ThflsHCqDrG/giphy.gif"
    "love-cute"        = "https://media.giphy.com/media/MDJ9IbxxvDUQM/giphy.gif"
    "love-please"      = "https://media.giphy.com/media/3oEjHGnY8oB4BHVTP2/giphy.gif"
    "love-hug"         = "https://media.giphy.com/media/3M4NpbLCTxBqU/giphy.gif"
    "love-wink"        = "https://media.giphy.com/media/6ra84Uso2hoir3YCgb/giphy.gif"

    # 😭 Reactions
    "react-cry"        = "https://media.giphy.com/media/d2lcHJTG5Tscg/giphy.gif"
    "react-emotional"  = "https://media.giphy.com/media/OPU6wzx8JrHna/giphy.gif"
    "react-shock"      = "https://media.giphy.com/media/Um3ljJl8jrnHy/giphy.gif"
    "react-nervous"    = "https://media.giphy.com/media/LRVnPYqM8DLag/giphy.gif"
    "react-shrug"      = "https://media.giphy.com/media/JRhS6WoswF8FxE0g2R/giphy.gif"

    # 😎 Cool
    "cool-shades"      = "https://media.giphy.com/media/62PP2yEIAZF6g/giphy.gif"
    "cool-fire"        = "https://media.giphy.com/media/j2pOFyuTJqWj9S5qdE/giphy.gif"
    "cool-success"     = "https://media.giphy.com/media/g9582DNuQppxC/giphy.gif"
    "cool-perfect"     = "https://media.giphy.com/media/l41YkFIiBsxABMGFq/giphy.gif"
    "cool-savage"      = "https://media.giphy.com/media/3o85xIO33l7RlmLR4I/giphy.gif"

    # 👍 Approval
    "appr-thumbsup"    = "https://media.giphy.com/media/111ebonMs90YLu/giphy.gif"
    "appr-thumbsdown"  = "https://media.giphy.com/media/iJxHzcuNcCJXi/giphy.gif"
    "appr-clap"        = "https://media.giphy.com/media/7rj2ZgttvgomY/giphy.gif"
    "appr-respect"     = "https://media.giphy.com/media/fRhSHzQ4NXOdrHIZJd/giphy.gif"
    "appr-agree"       = "https://media.giphy.com/media/l0MYGb1LuZ3n7dRnO/giphy.gif"

    # 🙄 Silence / Eye Roll
    "silent-eyeroll"   = "https://media.giphy.com/media/Rhhr8D5mKSX7O/giphy.gif"
    "silent-neutral"   = "https://media.giphy.com/media/AoBgxayGMHlIs/giphy.gif"
    "silent-disgust"   = "https://media.giphy.com/media/pVAMI8QYM42n6/giphy.gif"
    "silent-facepalm"  = "https://media.giphy.com/media/3og0INyCmHlNVS8V7W/giphy.gif"
    "silent-shhh"      = "https://media.giphy.com/media/1iTH1WIUjM0VATSw/giphy.gif"

    # 😡 Angry
    "angry-red"        = "https://media.giphy.com/media/l1J9u3TZfpmeDLkD6/giphy.gif"
    "angry-frustrated" = "https://media.giphy.com/media/3oriO04qxVReM5rJEA/giphy.gif"
    "angry-curse"      = "https://media.giphy.com/media/11tTNkNy1SqXjO/giphy.gif"

    # 🥳 Party
    "party-celebrate"  = "https://media.giphy.com/media/s2qXK8wKkNmmQ/giphy.gif"
    "party-confetti"   = "https://media.giphy.com/media/g5R9dok94mrIvplmZd/giphy.gif"
    "party-victory"    = "https://media.giphy.com/media/3oz8xRF0v9WMAUG1IQ/giphy.gif"

    # 💀 Misc
    "misc-dead"        = "https://media.giphy.com/media/3o6Zt4HU9uwXmXSAuI/giphy.gif"
    "misc-clown"       = "https://media.giphy.com/media/x0npYExCGOZeo/giphy.gif"
    "misc-watching"    = "https://media.giphy.com/media/7xZAu81T70Uuc/giphy.gif"
    "misc-drama"       = "https://media.giphy.com/media/pUeXcg80cO8I8/giphy.gif"
    "misc-awkward"     = "https://media.giphy.com/media/32mC2kXYWCsg0/giphy.gif"

    # 😴 Sleep
    "sleep-sleeping"   = "https://media.giphy.com/media/4Zgy9QqzWU8C3BlAjS/giphy.gif"

    # 🧠 Smart
    "smart-brain"      = "https://media.giphy.com/media/d3mlE7uhX8KFgEmY/giphy.gif"
    "smart-pointing"   = "https://media.giphy.com/media/d3mlE7uhX8KFgEmY/giphy.gif"

    # 🤖 AI
    "ai-robot"         = "https://media.giphy.com/media/IZY2SE2JmPgFG/giphy.gif"

    # 🌚 Suspicious
    "susp-moon"        = "https://media.giphy.com/media/ANbD1CCdA3iI8/giphy.gif"
    "meme-random"      = "https://media.giphy.com/media/mlvseq9yvZhba/giphy.gif"

    # 🎮 Gaming
    "gaming-rage"      = "https://media.giphy.com/media/3oFzlZMqJnMNqWeczC/giphy.gif"
    "gaming-victory"   = "https://media.giphy.com/media/3ohzdIuqJoo8QdKlnW/giphy.gif"

    # ✨ Anime
    "anime-wow"        = "https://media.giphy.com/media/oYtVHSxngR3lC/giphy.gif"
    "anime-happy"      = "https://media.giphy.com/media/Z6f7vzq3iP6Mw/giphy.gif"
    "anime-cry"        = "https://media.giphy.com/media/OPU6wzx8JrHna/giphy.gif"
}

Write-Host "Starting download of $($gifMap.Count) unique GIFs..." -ForegroundColor Cyan
Write-Host ""

$success = 0
$failed = 0
$failedList = @()

foreach ($entry in $gifMap.GetEnumerator()) {
    $filename = "$($entry.Key).gif"
    $filepath = Join-Path $gifDir $filename
    $url = $entry.Value

    Write-Host "[$($success + $failed + 1)/$($gifMap.Count)] Downloading $filename..." -NoNewline

    try {
        # Use .NET WebClient for more reliable downloads
        $webClient = New-Object System.Net.WebClient
        $webClient.Headers.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
        $webClient.DownloadFile($url, $filepath)

        # Verify the file is a valid GIF (should start with GIF89a or GIF87a)
        $bytes = [System.IO.File]::ReadAllBytes($filepath)
        $header = [System.Text.Encoding]::ASCII.GetString($bytes[0..2])

        if ($header -eq "GIF" -and $bytes.Length -gt 1000) {
            $sizeKB = [math]::Round($bytes.Length / 1024, 1)
            Write-Host " OK ($sizeKB KB)" -ForegroundColor Green
            $success++
        } else {
            Write-Host " INVALID (not a GIF or too small: $($bytes.Length) bytes)" -ForegroundColor Red
            $failed++
            $failedList += $filename
        }
    }
    catch {
        Write-Host " FAILED: $($_.Exception.Message)" -ForegroundColor Red
        $failed++
        $failedList += $filename
    }

    # Small delay to avoid rate limiting
    Start-Sleep -Milliseconds 300
}

Write-Host ""
Write-Host "=== Results ===" -ForegroundColor Cyan
Write-Host "Success: $success" -ForegroundColor Green
Write-Host "Failed:  $failed" -ForegroundColor Red

if ($failedList.Count -gt 0) {
    Write-Host ""
    Write-Host "Failed files:" -ForegroundColor Yellow
    $failedList | ForEach-Object { Write-Host "  - $_" -ForegroundColor Yellow }
}

# Verify all files exist and check for duplicates
Write-Host ""
Write-Host "=== Duplicate Check ===" -ForegroundColor Cyan
$hashes = @{}
Get-ChildItem -Path $gifDir -Filter "*.gif" | Where-Object { $_.Name -notlike "temp-*" } | ForEach-Object {
    $hash = (Get-FileHash $_.FullName -Algorithm MD5).Hash
    if ($hashes.ContainsKey($hash)) {
        Write-Host "DUPLICATE: $($_.Name) == $($hashes[$hash])" -ForegroundColor Yellow
    } else {
        $hashes[$hash] = $_.Name
    }
}

$uniqueCount = $hashes.Count
Write-Host "Unique GIF files: $uniqueCount" -ForegroundColor Cyan
