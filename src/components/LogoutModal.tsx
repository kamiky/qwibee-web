import { useState } from 'react';
import Modal from './Modal';

interface LogoutModalProps {
  onLogout: () => void;
}

export default function LogoutModal({ onLogout }: LogoutModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onLogout();
    } catch (error) {
      console.error('Logout error:', error);
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={isLoading}
      >
        {isLoading ? 'Logging out...' : 'Logout'}
      </button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onConfirm={handleConfirm}
        title="Confirm Logout"
        message="Are you sure you want to logout? You'll need to log in again to access your account."
        confirmText="Yes, Logout"
        cancelText="Cancel"
        confirmButtonClass="bg-red-500 hover:bg-red-600 focus:ring-red-500"
      />
    </>
  );
}
