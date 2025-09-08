param (
    [Parameter(Mandatory = $true)]
    [string]$RootPath
)

# Ensure the root path exists
if (-not (Test-Path -Path $RootPath -PathType Container)) {
    Write-Error "Root path '$RootPath' does not exist or is not a directory."
    exit 1
}

# Output directory
$DistDir = "dist-i18n"
if (-not (Test-Path -Path $DistDir)) {
    New-Item -Path $DistDir -ItemType Directory | Out-Null
}

# Helper function to merge JSON content recursively
function Merge-JsonRecursively {
    param (
        [string]$CurrentDir,
        [string]$FileName
    )

    $result = @{}

    # Load JSON from current directory if file exists
    $filePath = Join-Path -Path $CurrentDir -ChildPath $FileName
    if (Test-Path -Path $filePath) {
        Write-Host "Processing $filePath"
        $jsonContent = Get-Content -Path $filePath -Raw | ConvertFrom-Json -AsHashtable
        $result = $jsonContent
    }

    # Get subdirectories
    $subDirs = Get-ChildItem -Path $CurrentDir -Directory

    foreach ($subDir in $subDirs) {
        # Recursively process subdirectory for the same file name
        $subJson = Merge-JsonRecursively -CurrentDir $subDir.FullName -FileName $FileName

        if ($subJson.PsObject.Properties.Count -gt 0) {
            # Add under key equals to subdirectory name
            $result[$subDir.Name] = $subJson
        }
    }

    return $result
}

# Get all JSON files in the root directory (non-recursive)
$rootJsonFiles = Get-ChildItem -Path $RootPath -Filter *.json -File

foreach ($rootFile in $rootJsonFiles) {
    $mergedJson = Merge-JsonRecursively -CurrentDir $RootPath -FileName $rootFile.Name

    # Convert merged object to JSON string with indentation
    $jsonString = $mergedJson | ConvertTo-Json -Depth 100

    # Output file path
    $outputFile = Join-Path -Path $DistDir -ChildPath $rootFile.Name

    # Save merged JSON
    $jsonString | Out-File -FilePath $outputFile -Encoding UTF8

    Write-Host "Merged JSON saved to $outputFile"
}
