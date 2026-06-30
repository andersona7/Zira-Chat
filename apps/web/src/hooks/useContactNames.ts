import { useGetContactsQuery, contactApi } from '@/store/api/contactApi';
import { useMemo } from 'react';
import { store } from '@/store';

/**
 * Centralized display name resolver.
 * Priority:
 * 1. Saved Contact Nickname (customName)
 * 2. Contact's Full Name (fullName)
 * 3. Fallback User's Full Name (fullName)
 * 4. Never displays username.
 */
export function getDisplayName(
  userId: string | undefined,
  userObjOrString?: string | { fullName?: string; username?: string; displayName?: string } | null
): string {
  if (userId) {
    const state = store.getState();
    const contactsResult = contactApi.endpoints.getContacts.select()(state);
    const contacts = contactsResult?.data?.data || [];

    const contact = contacts.find(
      (c) => c.contactUser?.id === userId || (c.contactUser as any)?._id === userId
    );

    if (contact) {
      if (contact.customName?.trim()) {
        return contact.customName.trim();
      }
      if (contact.contactUser?.fullName?.trim()) {
        return contact.contactUser.fullName.trim();
      }
    }
  }

  if (userObjOrString) {
    if (typeof userObjOrString === 'string') {
      // Don't return string directly if it looks like username or starts with @
      if (userObjOrString.startsWith('@')) {
        return '';
      }
      return userObjOrString;
    }
    if (userObjOrString.fullName?.trim()) {
      return userObjOrString.fullName.trim();
    }
    if (
      userObjOrString.displayName?.trim() &&
      userObjOrString.displayName !== userObjOrString.username &&
      !userObjOrString.displayName.startsWith('@')
    ) {
      return userObjOrString.displayName.trim();
    }
  }

  return '';
}

export function useContactNames() {
  const { data: contactsData } = useGetContactsQuery();
  const contacts = contactsData?.data || [];

  const contactMap = useMemo(() => {
    const map = new Map<string, string>();
    contacts.forEach((c) => {
      const contactUserId = c.contactUser?.id || (c.contactUser as any)?._id;
      if (contactUserId && c.customName) {
        map.set(contactUserId, c.customName);
      }
    });
    return map;
  }, [contacts]);

  const getContactName = (
    userId: string | undefined,
    userObjOrString?: string | { fullName?: string; username?: string; displayName?: string } | null
  ) => {
    return getDisplayName(userId, userObjOrString);
  };

  return { getContactName, getDisplayName: getContactName, contactMap };
}
