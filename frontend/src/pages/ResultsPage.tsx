import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { ArrowLeft, Download } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getResults, downloadFile } from '../services/api'
import type { ResultsResponse } from '../types/api.types'
import StatusBanner from '../components/results/StatusBanner'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import Badge from '../components/common/Badge'
import Spinner from '../components/common/Spinner'

export default function ResultsPage() {
  const { jobId } = useParams<{ jobId: string }>()
  const navigate = useNavigate()
  const [results, setResults] = useState<ResultsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('summary')

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const data = await getResults(jobId!)
        setResults(data)
      } catch (error: any) {
        toast.error('Failed to load results')
        console.error(error)
      } finally {
        setLoading(false)
      }
    }

    if (jobId) {
      fetchResults()
    }
  }, [jobId])

  const handleDownload = async (fileType: string) => {
    if (!jobId) return

    try {
      const blob = await downloadFile(jobId, fileType)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileType
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success('Download started')
    } catch (error) {
      toast.error('Download failed')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-purple-50 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!results || !results.validation_result) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-purple-50 flex items-center justify-center">
        <Card>
          <div className="text-center">
            <p className="text-gray-600">No results found</p>
            <Button className="mt-4" onClick={() => navigate('/upload')}>
              Upload New Image
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  const { validation_result } = results

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-purple-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link
          to="/upload"
          className="inline-flex items-center text-purple-primary hover:text-purple-accent mb-8"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Upload
        </Link>

        <StatusBanner result={validation_result} />

        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <Card>
              <div className="flex space-x-2 mb-6 border-b">
                {['summary', 'forgery', 'qr', 'ocr', 'validation'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 font-medium capitalize transition-colors ${activeTab === tab
                      ? 'text-purple-primary border-b-2 border-purple-primary'
                      : 'text-gray-600 hover:text-purple-primary'
                      }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {activeTab === 'summary' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Overall Status</h3>
                    <Badge
                      variant={
                        validation_result.overall_status === 'VALID'
                          ? 'success'
                          : validation_result.overall_status === 'SUSPICIOUS'
                            ? 'warning'
                            : validation_result.overall_status === 'INVALID'
                              ? 'error'
                              : 'info'
                      }
                    >
                      {validation_result.overall_status}
                    </Badge>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Confidence Score</h3>
                    <p className="text-2xl font-bold text-purple-primary">
                      {(validation_result.overall_confidence * 100).toFixed(1)}%
                    </p>
                  </div>
                  {results.processing_time && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Processing Time</h3>
                      <p className="text-gray-700">{results.processing_time.toFixed(2)} seconds</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'forgery' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Forgery Detection Status</h3>
                    <div className="flex items-center space-x-4">
                      <Badge variant={validation_result.forgery_check.is_forged ? 'error' : 'success'}>
                        {validation_result.forgery_check.is_forged ? 'Forged' : 'Genuine'}
                      </Badge>
                      <span className="text-gray-700">
                        Confidence: {(validation_result.forgery_check.confidence * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {validation_result.forgery_check.annotated_image_url && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Analysis Result</h3>
                      <div className="border rounded-lg overflow-hidden bg-gray-100">
                        <img
                          src={`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${validation_result.forgery_check.annotated_image_url}`}
                          alt="Forgery Analysis"
                          className="w-full h-auto"
                        />
                      </div>
                      <p className="text-sm text-gray-500 mt-2">
                        Red boxes indicate detected manipulated regions.
                      </p>
                    </div>
                  )}

                  {!validation_result.forgery_check.annotated_image_url && validation_result.forgery_check.is_forged && (
                    <div className="p-4 bg-yellow-50 rounded-md border border-yellow-200">
                      <p className="text-yellow-700 text-sm">
                        Visual analysis not available for this detection.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'qr' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">QR Code Status</h3>
                    {validation_result.qr_validation && validation_result.qr_validation.decoded ? (
                      <>
                        <Badge variant="success">Decoded</Badge>
                        <p className="text-gray-700 mt-2">
                          {validation_result.qr_validation.attempt_number && (
                            <span className="block">
                              Successful on attempt{' '}
                              {validation_result.qr_validation.attempt_number}/4
                            </span>
                          )}
                          {validation_result.qr_validation.method && (
                            <span className="block text-sm text-gray-600">
                              Method: {validation_result.qr_validation.method}
                            </span>
                          )}
                        </p>
                      </>
                    ) : (
                      <>
                        <Badge variant="error">Not Decoded</Badge>
                        <p className="text-gray-700 mt-2 text-sm">
                          QR code could not be decoded. This case may be routed to manual review.
                        </p>
                      </>
                    )}
                  </div>

                  {validation_result.qr_validation &&
                    validation_result.qr_validation.decoded &&
                    validation_result.qr_validation.data && (
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-2">QR Extracted Data</h3>
                        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                          <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-2 text-left font-medium text-gray-600">Field</th>
                                <th className="px-4 py-2 text-left font-medium text-gray-600">Value</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              <tr>
                                <td className="px-4 py-2 text-gray-700">Name</td>
                                <td className="px-4 py-2 text-gray-900">
                                  {validation_result.qr_validation.data.name || '—'}
                                </td>
                              </tr>
                              <tr>
                                <td className="px-4 py-2 text-gray-700">Aadhaar Number</td>
                                <td className="px-4 py-2 text-gray-900">
                                  {validation_result.qr_validation.data.aadhaar_number || '—'}
                                </td>
                              </tr>
                              <tr>
                                <td className="px-4 py-2 text-gray-700">Date of Birth</td>
                                <td className="px-4 py-2 text-gray-900">
                                  {validation_result.qr_validation.data.dob || '—'}
                                </td>
                              </tr>
                              <tr>
                                <td className="px-4 py-2 text-gray-700">Gender</td>
                                <td className="px-4 py-2 text-gray-900">
                                  {validation_result.qr_validation.data.gender || '—'}
                                </td>
                              </tr>
                              <tr>
                                <td className="px-4 py-2 text-gray-700">Address</td>
                                <td className="px-4 py-2 text-gray-900 whitespace-pre-line">
                                  {validation_result.qr_validation.data.address || '—'}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                </div>
              )}
            </Card>
          </div>

          <div>
            <Card>
              <h3 className="font-semibold text-gray-900 mb-4">Download Reports</h3>
              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleDownload('report.pdf')}
                >
                  <Download className="w-4 h-4 mr-2 inline" />
                  PDF Report
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleDownload('report.html')}
                >
                  <Download className="w-4 h-4 mr-2 inline" />
                  HTML Report
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleDownload('data.json')}
                >
                  <Download className="w-4 h-4 mr-2 inline" />
                  JSON Data
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
