import type { ReactNode } from 'react';
import { Modal as MModal } from '@mantine/core';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export default function Modal({ open, onClose, title, children }: ModalProps) {
  return (
    <MModal opened={open} onClose={onClose} title={title}>
      {children}
    </MModal>
  );
}
