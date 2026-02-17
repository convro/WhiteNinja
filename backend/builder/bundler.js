import archiver from 'archiver'

/**
 * Bundle files into a ZIP for download
 */
export function createZipBundle(files, res) {
  res.setHeader('Content-Type', 'application/zip')
  res.setHeader('Content-Disposition', 'attachment; filename="white-ninja-build.zip"')

  const archive = archiver('zip', { zlib: { level: 9 } })
  archive.pipe(res)

  for (const file of files) {
    archive.append(file.content || '', { name: file.path })
  }

  archive.finalize()
}
