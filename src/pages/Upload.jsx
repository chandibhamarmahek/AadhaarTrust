import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

function Upload() {
  const { user } = useAuth()
  const [selectedFile, setSelectedFile] = useState(null)
  const [fileName, setFileName] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState(null)
  const [dragActive, setDragActive] = useState(false)

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }

  const handleFileSelect = (file) => {
    // Validate file type (you can customize this)
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
    if (!allowedTypes.includes(file.type)) {
      setUploadStatus({
        type: 'error',
        message: 'Please select a PDF, JPEG, or PNG file'
      })
      return
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setUploadStatus({
        type: 'error',
        message: 'File size must be less than 10MB'
      })
      return
    }

    setSelectedFile(file)
    setFileName(file.name)
    setUploadStatus(null)
  }

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0])
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!selectedFile) {
      setUploadStatus({
        type: 'error',
        message: 'Please select a file first'
      })
      return
    }

    setUploading(true)
    setUploadStatus(null)

    try {
      // Create FormData for file upload
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('userId', user?.id || '')
      formData.append('userEmail', user?.email || '')
      formData.append('uploadDate', new Date().toISOString())

      // TODO: Replace with actual API endpoint
      // const response = await fetch('/api/upload', {
      //   method: 'POST',
      //   body: formData
      // })

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000))

      // For now, store in localStorage
      const uploadHistory = JSON.parse(localStorage.getItem('uploadHistory') || '[]')
      const newUpload = {
        id: Date.now().toString(),
        fileName: fileName,
        fileSize: selectedFile.size,
        fileType: selectedFile.type,
        uploadDate: new Date().toISOString(),
        status: 'completed',
        userId: user?.id
      }
      uploadHistory.unshift(newUpload)
      localStorage.setItem('uploadHistory', JSON.stringify(uploadHistory))

      setUploadStatus({
        type: 'success',
        message: 'File uploaded successfully!'
      })

      // Reset form
      setSelectedFile(null)
      setFileName('')
      const fileInput = document.getElementById('file-input')
      if (fileInput) fileInput.value = ''

    } catch (error) {
      setUploadStatus({
        type: 'error',
        message: 'Upload failed. Please try again.'
      })
    } finally {
      setUploading(false)
    }
  }

  const removeFile = () => {
    setSelectedFile(null)
    setFileName('')
    setUploadStatus(null)
    const fileInput = document.getElementById('file-input')
    if (fileInput) fileInput.value = ''
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Upload Document</h1>
        <p className="text-gray-600">Select and upload your Aadhaar document for verification</p>
      </div>

      {/* Upload Form */}
      <div className="bg-white rounded-xl shadow-lg p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* File Drop Zone */}
          <div
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300 ${
              dragActive
                ? 'border-indigo-500 bg-indigo-50'
                : selectedFile
                ? 'border-green-500 bg-green-50'
                : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            {selectedFile ? (
              <div className="space-y-4">
                <div className="flex items-center justify-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div>
                  <p className="text-lg font-semibold text-gray-900">{fileName}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <button
                  type="button"
                  onClick={removeFile}
                  className="text-red-600 hover:text-red-700 text-sm font-medium"
                >
                  Remove file
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-center">
                  <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                </div>
                <div>
                  <p className="text-lg font-semibold text-gray-900">
                    Drag and drop your file here
                  </p>
                  <p className="text-sm text-gray-500 mt-1">or</p>
                </div>
                <label
                  htmlFor="file-input"
                  className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 cursor-pointer transition-colors duration-200"
                >
                  Browse Files
                </label>
                <input
                  id="file-input"
                  type="file"
                  className="hidden"
                  onChange={handleFileInput}
                  accept=".pdf,.jpg,.jpeg,.png"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Supported formats: PDF, JPEG, PNG (Max 10MB)
                </p>
              </div>
            )}
          </div>

          {/* Status Message */}
          {uploadStatus && (
            <div
              className={`p-4 rounded-lg ${
                uploadStatus.type === 'success'
                  ? 'bg-green-50 border border-green-200 text-green-800'
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}
            >
              <div className="flex items-center">
                {uploadStatus.type === 'success' ? (
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                )}
                <span>{uploadStatus.message}</span>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!selectedFile || uploading}
              className={`px-8 py-3 rounded-lg font-semibold text-white transition-all duration-200 ${
                !selectedFile || uploading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg transform hover:scale-105'
              }`}
            >
              {uploading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Uploading...
                </span>
              ) : (
                'Submit'
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Info Section */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-2 flex items-center">
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          Upload Guidelines
        </h3>
        <ul className="list-disc list-inside space-y-1 text-sm text-blue-800">
          <li>Ensure the document is clear and readable</li>
          <li>File size should not exceed 10MB</li>
          <li>Accepted formats: PDF, JPEG, PNG</li>
          <li>Make sure all information is visible and not cropped</li>
        </ul>
      </div>
    </div>
  )
}

export default Upload

