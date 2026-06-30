import { useEffect, useRef } from 'react';

interface DraftInfo {
  text: string;
  selectionStart: number;
  selectionEnd: number;
}

// Module-level cache to preserve drafts, cursor positions, and selection states across chats
const draftsMap = new Map<string, DraftInfo>();

export function clearDraft(chatId: string) {
  draftsMap.delete(chatId);
}

export interface FocusOverlays {
  showEmojiPicker: boolean;
  showGifPicker: boolean;
  isContactShareOpen: boolean;
  showAttachMenu: boolean;
  isRecording: boolean;
  isLocked: boolean;
  isBlocked: boolean;
  disabled?: boolean;
}

export function useChatComposerFocus(
  inputRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>,
  activeChatId: string | undefined,
  text: string,
  setText: (val: string) => void,
  activePanel: string | null,
  overlays: FocusOverlays
) {
  const previousChatIdRef = useRef<string | undefined>(activeChatId);

  // Helper to trigger focus and restore draft cursor / selection
  const triggerFocus = () => {
    // Postpone execution until animations/transitions complete and layout settles
    requestAnimationFrame(() => {
      setTimeout(() => {
        const input = inputRef.current;
        if (!input) return;

        // PREVENTION CHECKS
        // 1. Mobile touch devices check
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        );
        const hasHardwareKeyboard = window.matchMedia('(pointer: fine)').matches;
        if (isMobile && !hasHardwareKeyboard) return;

        // 2. Disabled/Blocked/Locked conditions
        if (overlays.isLocked || overlays.isBlocked || overlays.disabled || input.disabled) return;

        // 3. Active pickers, recording, or modal overlays
        if (
          overlays.showEmojiPicker ||
          overlays.showGifPicker ||
          overlays.isContactShareOpen ||
          overlays.showAttachMenu ||
          overlays.isRecording
        ) {
          return;
        }

        // 4. Checking if user is typing elsewhere
        const activeElement = document.activeElement;
        const isUserTypingElsewhere =
          activeElement &&
          activeElement !== input &&
          (activeElement.tagName === 'INPUT' ||
            activeElement.tagName === 'TEXTAREA' ||
            activeElement.getAttribute('contenteditable') === 'true');

        if (isUserTypingElsewhere) return;

        // 5. Checking if user is actively selecting text/messages in the document
        const selection = window.getSelection();
        if (selection && selection.toString() !== '') return;

        // Focus the input
        input.focus();

        // Restore caret / text selection
        if (activeChatId) {
          const draft = draftsMap.get(activeChatId);
          if (draft) {
            try {
              input.setSelectionRange(draft.selectionStart, draft.selectionEnd);
            } catch (e) {
              const len = input.value.length;
              input.setSelectionRange(len, len);
            }
          } else {
            const len = input.value.length;
            input.setSelectionRange(len, len);
          }
        }
      }, 50);
    });
  };

  // 1. Detect conversation change. Save previous draft, load current draft, and focus.
  useEffect(() => {
    const prevChatId = previousChatIdRef.current;
    
    // Save draft of the previous chat before switching
    if (prevChatId && prevChatId !== activeChatId) {
      const input = inputRef.current;
      draftsMap.set(prevChatId, {
        text,
        selectionStart: input ? input.selectionStart ?? text.length : text.length,
        selectionEnd: input ? input.selectionEnd ?? text.length : text.length,
      });
    }

    // Load draft of the new active chat
    if (activeChatId) {
      const draft = draftsMap.get(activeChatId);
      if (draft) {
        setText(draft.text);
      } else {
        setText('');
      }
    }

    previousChatIdRef.current = activeChatId;

    if (activeChatId) {
      triggerFocus();
    }
  }, [activeChatId]);

  // 2. Focus when coming back from active panel (like contact info, message info, search, etc.)
  useEffect(() => {
    if (activePanel === null && activeChatId) {
      triggerFocus();
    }
  }, [activePanel]);

  // 3. Focus when pickers/overlays close
  useEffect(() => {
    if (
      !overlays.showEmojiPicker &&
      !overlays.showGifPicker &&
      !overlays.isContactShareOpen &&
      !overlays.showAttachMenu &&
      !overlays.isRecording &&
      activeChatId
    ) {
      triggerFocus();
    }
  }, [
    overlays.showEmojiPicker,
    overlays.showGifPicker,
    overlays.isContactShareOpen,
    overlays.showAttachMenu,
    overlays.isRecording,
  ]);

  // 4. Focus when browser tab focus returns
  useEffect(() => {
    const handleWindowFocus = () => {
      if (activeChatId) {
        triggerFocus();
      }
    };
    window.addEventListener('focus', handleWindowFocus);
    return () => {
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [activeChatId, overlays]);

  // 5. Real-time event listeners on input element to save draft text and cursor position
  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    const handleInput = () => {
      if (activeChatId) {
        const current = draftsMap.get(activeChatId) || { text: '', selectionStart: 0, selectionEnd: 0 };
        draftsMap.set(activeChatId, {
          ...current,
          text: input.value,
        });
      }
    };

    const handleSelection = () => {
      if (activeChatId) {
        const current = draftsMap.get(activeChatId) || { text: '', selectionStart: 0, selectionEnd: 0 };
        draftsMap.set(activeChatId, {
          ...current,
          selectionStart: input.selectionStart ?? input.value.length,
          selectionEnd: input.selectionEnd ?? input.value.length,
        });
      }
    };

    input.addEventListener('input', handleInput);
    input.addEventListener('select', handleSelection);
    input.addEventListener('keyup', handleSelection);
    input.addEventListener('click', handleSelection);

    return () => {
      input.removeEventListener('input', handleInput);
      input.removeEventListener('select', handleSelection);
      input.removeEventListener('keyup', handleSelection);
      input.removeEventListener('click', handleSelection);
    };
  }, [activeChatId, inputRef.current]);

  return { triggerFocus };
}
