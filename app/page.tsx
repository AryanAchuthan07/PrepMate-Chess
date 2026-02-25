'use client'

import { useState } from 'react'
import OpponentAnalysis from '@/components/OpponentAnalysis'
import BlindfoldsTraining from '@/components/BlindfoldsTraining'

export default function Home() {
  const [tab, setTab] = useState<'analysis' | 'blindfold'>('analysis')

  return (
    <main className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900">PrepMate Chess</h1>
          <p className="text-gray-600 mt-2">Prepare for opponents and train your visualization skills</p>
        </div>

        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => setTab('analysis')}
              className={`px-4 py-2 rounded ${tab === 'analysis' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700'}`}
            >
              Analysis
            </button>
            <button
              onClick={() => setTab('blindfold')}
              className={`px-4 py-2 rounded ${tab === 'blindfold' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700'}`}
            >
              Blindfold Training
            </button>
          </div>
        </div>

        <div>
          {tab === 'analysis' ? <OpponentAnalysis /> : <BlindfoldsTraining />}
        </div>
      </div>
    </main>
  )
}
