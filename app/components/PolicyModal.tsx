'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Loader2 } from 'lucide-react'

interface PolicyModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  policy?: any
  clients: any[]
}

export default function PolicyModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  policy,
  clients 
}: PolicyModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    client_id: '',
    policy_number: '',
    type: 'life',
    premium: '',
    commission_amount: '',
    renewal_date: '',
    status: 'active'
  })

  useEffect(() => {
  if (policy) {
    setFormData({
      client_id: policy.client_id || '',
      policy_number: policy.policy_number || '',
      type: policy.type || 'life',
      premium: policy.premium?.toString() || '',
      commission_amount: policy.commission_amount?.toString() || '',
      renewal_date: policy.renewal_date?.split('T')[0] || '',
      status: policy.status || 'active'
    })
  } else {
    // Auto-generate policy number for new policies
    const autoPolicyNumber = `POL-${Date.now().toString().slice(-6)}`
    setFormData({
      client_id: '',
      policy_number: autoPolicyNumber,
      type: 'life',
      premium: '',
      commission_amount: '',
      renewal_date: '',
      status: 'active'
    })
  }
}, [policy])

  // Add this function
const handlePremiumChange = (value: string) => {
  const premium = parseFloat(value) || 0
  const commission = premium * 0.10 // 10% commission
  
  setFormData({
    ...formData,
    premium: value,
    commission_amount: commission.toFixed(2)
  })
}

// Update input field to use this:
<input
  type="number"
  value={formData.premium}
  onChange={(e) => handlePremiumChange(e.target.value)}
  // ... rest of props
/>

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  setLoading(true)

  try {
    // Log what we're sending
    console.log('📤 Submitting policy data:', formData)

    const data = {
      client_id: formData.client_id,
      policy_number: formData.policy_number || `POL-${Date.now()}`, // Auto-generate if empty
      type: formData.type,
      premium: parseFloat(formData.premium) || 0,
      commission_amount: parseFloat(formData.commission_amount) || 0,
      renewal_date: formData.renewal_date || null,
      status: formData.status
    }

    console.log('📤 Final data to insert:', data)

    if (policy) {
      const { error } = await supabase
        .from('policies')
        .update(data)
        .eq('id', policy.id)

      if (error) {
        console.error('❌ Update error:', error)
        alert(`Update failed: ${error.message}`)
        throw error
      }
    } else {
      const { error } = await supabase
        .from('policies')
        .insert([data])

      if (error) {
        console.error('❌ Insert error:', error)
        alert(`Insert failed: ${error.message}`)
        throw error
      }
    }

    onSuccess()
    onClose()
  } catch (error: any) {
    console.error('❌ Error saving policy:', error)
    alert(`Failed to save policy: ${error?.message || 'Unknown error'}`)
  } finally {
    setLoading(false)
  }
}

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
            <h2 className="text-xl font-bold text-gray-900">
              {policy ? 'Edit Policy' : 'Add New Policy'}
            </h2>
          </div>
          
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Client */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Client *
              </label>
              <select
  value={formData.client_id}
  onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 text-sm"
  required
>
  <option value="">Select Client</option>
  {clients.map((client) => (
    <option key={client.id} value={client.id}>
      {client.first_name} {client.last_name} - {client.phone || 'No Phone'} ({client.email})
    </option>
  ))}
</select>
            </div>

            {/* Policy Number */}
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1.5">
    Policy Number *
  </label>
  <div className="flex gap-2">
    <input
      type="text"
      value={formData.policy_number}
      onChange={(e) => setFormData({ ...formData, policy_number: e.target.value })}
      className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 text-sm"
      required
      placeholder="e.g., POL-2024-001"
    />
    <button
      type="button"
      onClick={() => {
        const newNumber = `POL-${Date.now().toString().slice(-6)}`
        setFormData({ ...formData, policy_number: newNumber })
      }}
      className="px-3 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
    >
      Auto
    </button>
  </div>
</div>

            {/* Type and Status */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Type *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 text-sm"
                  required
                >
                  <option value="life">Life</option>
                  <option value="health">Health</option>
                  <option value="auto">Auto</option>
                  <option value="home">Home</option>
                  <option value="business">Business</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 text-sm"
                >
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="expired">Expired</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            {/* Premium and Commission */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Premium ($) *
                </label>
                <input
                  type="number"
                  value={formData.premium}
                  onChange={(e) => setFormData({ ...formData, premium: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 text-sm"
                  required
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Commission ($)
                </label>
                <input
                  type="number"
                  value={formData.commission_amount}
                  onChange={(e) => setFormData({ ...formData, commission_amount: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 text-sm"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Renewal Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Renewal Date
              </label>
              <input
                type="date"
                value={formData.renewal_date}
                onChange={(e) => setFormData({ ...formData, renewal_date: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 text-sm"
              />
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-3 justify-end border-t border-gray-200 pt-5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-70"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  policy ? 'Update Policy' : 'Create Policy'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}