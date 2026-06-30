import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, Input, Button, Avatar } from '@zira/ui';
import { useAddContactMutation } from '@/store/api/contactApi';
import toast from 'react-hot-toast';
import { UserPlus } from 'lucide-react';

interface AddContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialUsername?: string;
  initialCustomName?: string;
  sharedContactInfo?: {
    profilePhoto?: string;
    username: string;
    fullName: string;
  };
  onSuccess?: () => void;
}

const addContactSchema = z.object({
  username: z.string().min(3, 'Enter a valid username'),
  customName: z.string().optional(),
});

type AddContactForm = z.infer<typeof addContactSchema>;

export const AddContactModal: React.FC<AddContactModalProps> = ({ 
  isOpen, 
  onClose,
  initialUsername = '',
  initialCustomName = '',
  sharedContactInfo,
  onSuccess
}) => {
  const [addContact, { isLoading }] = useAddContactMutation();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<AddContactForm>({
    resolver: zodResolver(addContactSchema),
    defaultValues: {
      username: initialUsername,
      customName: initialCustomName,
    }
  });

  // Reset values when modal opens/changes with new props
  useEffect(() => {
    if (isOpen) {
      reset({
        username: initialUsername,
        customName: initialCustomName,
      });
    }
  }, [isOpen, initialUsername, initialCustomName, reset]);

  const onSubmit = async (data: AddContactForm) => {
    try {
      const res = await addContact(data).unwrap();
      if (res.success) {
        toast.success('Contact added!');
        reset();
        onClose();
        if (onSuccess) {
          onSuccess();
        }
      }
    } catch (err: any) {
      toast.error(err.data?.error || 'Failed to add contact');
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Add Contact">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {sharedContactInfo && (
          <div className="flex flex-col items-center gap-3 pb-4 border-b border-border">
            <Avatar
              src={sharedContactInfo.profilePhoto}
              fallback={sharedContactInfo.fullName || sharedContactInfo.username}
              size="lg"
              className="w-16 h-16 shadow-md border border-border"
            />
            <div className="text-center">
              <h3 className="font-semibold text-text-primary text-base">
                {sharedContactInfo.fullName}
              </h3>
              <p className="text-xs text-text-muted">@{sharedContactInfo.username}</p>
            </div>
          </div>
        )}

        <Input
          label="Username"
          placeholder="Enter their username"
          {...register('username')}
          error={errors.username?.message}
          readOnly={!!sharedContactInfo}
          className={sharedContactInfo ? 'bg-surface-hover/50 text-text-muted pointer-events-none' : ''}
          autoFocus={!sharedContactInfo}
        />
        
        <Input
          label="Custom Name / Nickname (optional)"
          placeholder="Enter custom nickname"
          {...register('customName')}
          autoFocus={!!sharedContactInfo}
        />

        <Button type="submit" className="w-full mt-2" isLoading={isLoading}>
          <UserPlus className="w-4 h-4" />
          Add Contact
        </Button>
      </form>
    </Dialog>
  );
};