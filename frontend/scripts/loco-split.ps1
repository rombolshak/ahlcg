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

function Split-JsonRecursively {
    param (
        [pscustomobject]$JsonObject,
        [string]$CurrentDir,
        [string]$FileName
    )

    # Prepare hashtable for root-level keys (non-subdirectory keys)
    $rootKeys = @{}

    foreach ($key in $JsonObject.PSObject.Properties.Name) {
        $value = $JsonObject.$key

        # Check if value is an object and if it looks like a subdirectory (heuristic: object with properties)
        if ($value -is [pscustomobject]) {
            # We treat this key as a subdirectory name
            $subDirPath = Join-Path -Path $CurrentDir -ChildPath $key
            if (-not (Test-Path -Path $subDirPath)) {
                New-Item -Path $subDirPath -ItemType Directory | Out-Null
            }

            # Recursively split the sub-object into files in the subdirectory
            Split-JsonRecursively -JsonObject $value -CurrentDir $subDirPath -FileName $FileName
        }
        else {
            # Not an object, treat as root-level key
            $rootKeys[$key] = $value
        }
    }

    # Save the root-level keys as JSON file in current directory
    # If there are any root keys, save the JSON file
    if ($rootKeys.Count -gt 0) {
        $jsonString = $rootKeys | ConvertTo-Json -Depth 100
        $outputFile = Join-Path -Path $CurrentDir -ChildPath $FileName
        $jsonString | Out-File -FilePath $outputFile -Encoding UTF8
        Write-Host "Saved $outputFile"
    }
}

# Process each JSON file in the merged directory (non-recursive)
$mergedFiles = Get-ChildItem -Path $MergedDirPath -Filter *.json -File

foreach ($mergedFile in $mergedFiles) {
    Write-Host "Processing merged file: $($mergedFile.FullName)"

    # Load merged JSON content
    $mergedJson = Get-Content -Path $mergedFile.FullName -Raw | ConvertFrom-Json
    Split-JsonRecursively -JsonObject $mergedJson -CurrentDir $OutputRootPath -FileName $mergedFile.Name
}
