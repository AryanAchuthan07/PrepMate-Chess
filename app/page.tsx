'use client'

import OpponentAnalysis from '@/components/OpponentAnalysis'
import BlindfoldsTraining from '@/components/BlindfoldsTraining'

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-center mb-2">
            <h1 className="text-4xl font-bold text-gray-900">
              PrepMate Chess
            </h1>
          </div>
          <p className="text-center text-gray-600">
            Prepare for opponents and train your visualization skills
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <OpponentAnalysis />
          <BlindfoldsTraining />
        </div>
      </div>
    </main>
  )
}
