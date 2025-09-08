param (
    [Parameter(Mandatory = $true)]
    [string]$MergedDirPath,

    [Parameter(Mandatory = $true)]
    [string]$OutputRootPath
)

# Validate merged directory path
if (-not (Test-Path -Path $MergedDirPath -PathType Container)) {
    Write-Error "Merged directory '$MergedDirPath' does not exist or is not a directory."
    exit 1
}

# Create output root directory if it doesn't exist
if (-not (Test-Path -Path $OutputRootPath)) {
    New-Item -Path $OutputRootPath -ItemType Directory | Out-Null
}

function Sort-ObjectProperties {
    param (
        [pscustomobject]$Object
    )

    $ordered = [ordered]@{}

    foreach ($key in ($Object.PSObject.Properties.Name | Sort-Object)) {
        $value = $Object.$key

        if ($value -is [pscustomobject]) {
            $ordered[$key] = Sort-ObjectProperties -Object $value
        }
        else {
            $ordered[$key] = $value
        }
    }

    return $ordered
}

function Split-JsonRecursively {
    param (
        [pscustomobject]$JsonObject,
        [string]$CurrentDir,
        [string]$FileName
    )

    $rootKeys = @{}

    foreach ($key in $JsonObject.PSObject.Properties.Name) {
        $value = $JsonObject.$key

        if ($value -is [pscustomobject]) {
            # Check if subdirectory exists
            $subDirPath = Join-Path -Path $CurrentDir -ChildPath $key
            if (Test-Path -Path $subDirPath -PathType Container) {
                # Subdirectory exists - recurse into it
                Split-JsonRecursively -JsonObject $value -CurrentDir $subDirPath -FileName $FileName
            }
            else {
                # Subdirectory does NOT exist - flatten this object as root key
                $rootKeys[$key] = $value
            }
        }
        else {
            # Primitive value, add as root key
            $rootKeys[$key] = $value
        }
    }

    # Sort root keys alphabetically
    $sortedRootKeys = Sort-ObjectProperties -Object ([pscustomobject]$rootKeys)

    if ($sortedRootKeys.Count -gt 0) {
        $jsonString = $sortedRootKeys | ConvertTo-Json -Depth 100
        $outputFile = Join-Path -Path $CurrentDir -ChildPath $FileName
        $jsonString | Out-File -FilePath $outputFile -Encoding UTF8
        Write-Host "Saved $outputFile with $($sortedRootKeys.Count) props"
    }
    else {
        Write-Host "No root keys in $CurrentDir, skipping JSON file creation."
    }
}

# Process each JSON file in the merged directory (non-recursive)
$mergedFiles = Get-ChildItem -Path $MergedDirPath -Filter *.json -File

foreach ($mergedFile in $mergedFiles) {
    Write-Host "Processing merged file: $($mergedFile.FullName)"

    $mergedJson = Get-Content -Path $mergedFile.FullName -Raw | ConvertFrom-Json

    Split-JsonRecursively -JsonObject $mergedJson -CurrentDir $OutputRootPath -FileName $mergedFile.Name
}
