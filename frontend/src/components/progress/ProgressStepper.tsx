import { Check, Loader2 } from 'lucide-react'
import { STAGES } from '../../config/constants'



interface ProgressStepperProps {
  currentStage: string
}

export default function ProgressStepper({ currentStage }: ProgressStepperProps) {
  const getStepStatus = (stageId: string): 'completed' | 'active' | 'pending' => {
    const currentIndex = STAGES.findIndex(s => s.id === currentStage)
    const stepIndex = STAGES.findIndex(s => s.id === stageId)

    if (stepIndex < currentIndex) return 'completed'
    if (stepIndex === currentIndex) return 'active'
    return 'pending'
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        {STAGES.map((stage, index) => {
          const status = getStepStatus(stage.id)
          const isLast = index === STAGES.length - 1

          return (
            <div key={stage.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div className="relative">
                  {status === 'active' && (
                    <div className="absolute inset-0 rounded-full bg-purple-400 animate-ping opacity-75" />
                  )}
                  <div
                    className={`
                      relative z-10 w-12 h-12 rounded-full flex items-center justify-center
                      transition-all duration-300 shadow-md
                      ${status === 'completed'
                        ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-emerald-200'
                        : status === 'active'
                          ? 'bg-gradient-to-br from-purple-500 to-purple-700 text-white ring-4 ring-purple-100'
                          : 'bg-gray-100 text-gray-400 border border-gray-200'
                      }
                    `}
                  >
                    {status === 'completed' ? (
                      <Check className="w-6 h-6" />
                    ) : status === 'active' ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <span className="font-medium">{index + 1}</span>
                    )}
                  </div>
                </div>
                <p
                  className={`
                    mt-2 text-sm font-medium
                    ${status === 'active' ? 'text-purple-primary' : 'text-gray-500'}
                  `}
                >
                  {stage.label}
                </p>
              </div>
              {!isLast && (
                <div
                  className={`
                    h-1 flex-1 mx-2 -mt-6
                    ${status === 'completed' ? 'bg-emerald-500' : 'bg-gray-200'}
                    transition-all duration-300
                  `}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
