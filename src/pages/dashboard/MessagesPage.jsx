import { useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

const getErrorMessage = (error, fallback) => error.response?.data?.message || error.message || fallback;

const formatTime = (value) => {
  if (!value) return '';
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
};

const messageKey = (message) => message.id || `${message.senderId}-${message.createdAt}-${message.content}`;

const MessagesPage = () => {
  const { user, profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const targetUserId = searchParams.get('userId');
  const targetRoomId = searchParams.get('roomId');
  const [contacts, setContacts] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [socketUrl, setSocketUrl] = useState(import.meta.env.VITE_PAPERSIGNAL_SOCKET_URL || '');
  const [isLoading, setIsLoading] = useState(true);
  const [roomLoading, setRoomLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [showConvoList, setShowConvoList] = useState(true);
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const autoOpenUserRef = useRef('');
  const autoOpenRoomRef = useRef('');

  const currentUserName = user?.accountType === 'business'
    ? profile?.businessName || profile?.contactName || user?.email
    : profile?.displayName || [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') || user?.email;

  const conversationItems = useMemo(() => {
    const contactMap = new Map(contacts.map((contact) => [contact.userId, contact]));
    const items = conversations.map((conversation) => {
      const contact = contactMap.get(conversation.otherUserId);
      return {
        id: conversation.roomId,
        roomId: conversation.roomId,
        name: contact?.name || conversation.name,
        avatar: contact?.avatar || (conversation.name || 'CN').slice(0, 2).toUpperCase(),
        lastMessage: conversation.lastMessage?.content || 'No messages yet.',
        lastMessageAt: conversation.lastMessageAt,
        unreadCount: conversation.unreadCount || 0,
        contact,
      };
    });

    contacts.forEach((contact) => {
      const exists = items.some((item) => item.contact?.userId === contact.userId || item.name === contact.name);
      if (!exists) {
        items.push({
          id: `contact-${contact.userId}`,
          roomId: null,
          name: contact.name,
          avatar: contact.avatar,
          lastMessage: 'Start a conversation.',
          lastMessageAt: contact.connectedAt,
          unreadCount: 0,
          contact,
        });
      }
    });

    return items.sort((a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0));
  }, [contacts, conversations]);

  const loadSidebar = async () => {
    setError('');
    setIsLoading(true);

    try {
      const [configResult, contactsResult, conversationsResult] = await Promise.allSettled([
        api.get('/messages/config'),
        api.get('/messages/contacts'),
        api.get('/messages/conversations'),
      ]);

      if (configResult.status === 'fulfilled') {
        setSocketUrl(configResult.value.data.data?.socketUrl || import.meta.env.VITE_PAPERSIGNAL_SOCKET_URL || '');
      } else {
        setSocketUrl(import.meta.env.VITE_PAPERSIGNAL_SOCKET_URL || '');
      }

      if (contactsResult.status === 'fulfilled') {
        setContacts(contactsResult.value.data.data || []);
      } else {
        setContacts([]);
        if (contactsResult.reason?.response?.status === 401 || contactsResult.reason?.response?.status >= 500) {
          setError(getErrorMessage(contactsResult.reason, 'Messages are temporarily unavailable.'));
        }
      }

      if (conversationsResult.status === 'fulfilled') {
        setConversations(conversationsResult.value.data.data?.conversations || []);
      } else {
        setConversations([]);
      }
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Messages are temporarily unavailable.'));
    } finally {
      setIsLoading(false);
    }
  };

  const appendMessage = (message) => {
    setMessages((current) => {
      const key = messageKey(message);
      if (current.some((item) => messageKey(item) === key)) return current;
      return [...current, message];
    });
  };

  const loadRoom = async (roomId) => {
    setRoomLoading(true);
    setError('');

    try {
      const response = await api.get(`/messages/conversations/${roomId}`, { params: { limit: 60 } });
      const room = response.data.data?.room;
      const roomMessages = response.data.data?.messages || [];
      setActiveRoom(room);
      setMessages(roomMessages);
      setShowConvoList(false);
      await api.post(`/messages/conversations/${roomId}/read`).catch(() => {});
      loadSidebar();
    } catch (roomError) {
      setError(getErrorMessage(roomError, 'Failed to open conversation'));
    } finally {
      setRoomLoading(false);
    }
  };

  const selectItem = async (item) => {
    if (item.roomId) {
      autoOpenRoomRef.current = item.roomId;
      setSearchParams({ roomId: item.roomId }, { replace: true });
      await loadRoom(item.roomId);
      return;
    }

    if (!item.contact?.userId) return;

    setRoomLoading(true);
    setError('');

    try {
      const response = await api.post('/messages/conversations/direct', {
        recipientId: item.contact.userId,
      });
      const room = response.data.data?.room;
      await loadSidebar();
      await loadRoom(room.roomId);
      autoOpenRoomRef.current = room.roomId;
      setSearchParams({ roomId: room.roomId }, { replace: true });
    } catch (startError) {
      setError(getErrorMessage(startError, 'Failed to start conversation'));
    } finally {
      setRoomLoading(false);
    }
  };

  const handleSend = async (event) => {
    event.preventDefault();
    if (!newMessage.trim() || !activeRoom?.roomId) return;

    const content = newMessage.trim();
    setNewMessage('');
    setSending(true);
    setError('');

    try {
      const response = await api.post(`/messages/conversations/${activeRoom.roomId}/messages`, {
        content,
        messageType: 'text',
      });
      appendMessage(response.data.data);
      socketRef.current?.emit('send-room-message', {
        roomId: activeRoom.roomId,
        message: response.data.data,
      });
      loadSidebar();
    } catch (sendError) {
      setNewMessage(content);
      setError(getErrorMessage(sendError, 'Failed to send message'));
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    loadSidebar();
  }, []);

  useEffect(() => {
    if (isLoading || !targetUserId || autoOpenUserRef.current === targetUserId) return;

    const contact = contacts.find((item) => item.userId === targetUserId);
    if (!contact) {
      if (contacts.length > 0) {
        setError('You can only message accepted connections.');
      }
      return;
    }

    autoOpenUserRef.current = targetUserId;
    selectItem({
      id: `contact-${contact.userId}`,
      roomId: null,
      name: contact.name,
      avatar: contact.avatar,
      contact,
    });
  // The selected contact is driven by the URL once per target user.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contacts, isLoading, targetUserId]);

  useEffect(() => {
    if (isLoading || targetUserId || activeRoom?.roomId || roomLoading) return;

    const roomIdToOpen = targetRoomId || conversationItems.find((item) => item.roomId)?.roomId;
    if (!roomIdToOpen || autoOpenRoomRef.current === roomIdToOpen) return;

    autoOpenRoomRef.current = roomIdToOpen;
    if (!targetRoomId) {
      setSearchParams({ roomId: roomIdToOpen }, { replace: true });
    }
    loadRoom(roomIdToOpen);
  // Existing conversations should auto-open once after the sidebar has loaded.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationItems, isLoading, targetRoomId, targetUserId, activeRoom?.roomId, roomLoading]);

  useEffect(() => {
    if (!socketUrl || !user?.id) return undefined;

    const socket = io(socketUrl, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      if (activeRoom?.roomId) {
        socket.emit('join-room', {
          roomId: activeRoom.roomId,
          userId: user.id,
          userName: currentUserName,
        });
      }
    });

    socket.on('receive-room-message', (data) => {
      if (data.roomId !== activeRoom?.roomId) {
        loadSidebar();
        return;
      }

      appendMessage({
        id: data.message?.id,
        senderId: data.message?.userId,
        senderName: data.message?.userName,
        senderAvatar: data.message?.userAvatar,
        content: data.message?.content,
        messageType: data.message?.messageType || 'text',
        reactions: data.message?.reactions || {},
        isMine: data.message?.userId === user.id,
        createdAt: data.message?.createdAt || new Date().toISOString(),
      });
      api.post(`/messages/conversations/${activeRoom.roomId}/read`).catch(() => {});
      loadSidebar();
    });

    socket.on('messages-read', () => loadSidebar());

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [socketUrl, user?.id, activeRoom?.roomId, currentUserName]);

  useEffect(() => {
    if (!socketRef.current || !activeRoom?.roomId || !user?.id) return undefined;

    socketRef.current.emit('join-room', {
      roomId: activeRoom.roomId,
      userId: user.id,
      userName: currentUserName,
    });

    return () => {
      socketRef.current?.emit('leave-room', {
        roomId: activeRoom.roomId,
        userId: user.id,
      });
    };
  }, [activeRoom?.roomId, user?.id, currentUserName]);

  useEffect(() => {
    if (!socketRef.current || !user?.id) return;

    conversations.forEach((conversation) => {
      if (!conversation.roomId) return;
      socketRef.current.emit('join-room', {
        roomId: conversation.roomId,
        userId: user.id,
        userName: currentUserName,
      });
    });
  }, [conversations, user?.id, currentUserName]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, activeRoom?.roomId]);

  const activeTitle = activeRoom?.name || 'Select a conversation';

  return (
    <div className="flex h-[calc(100vh-7rem)] -m-4 lg:-m-8 bg-white rounded-xl lg:rounded-none overflow-hidden border border-gray-200 lg:border-0">
      <div className={`w-full md:w-80 lg:w-96 border-r border-gray-200 flex-col bg-white flex-shrink-0 ${!showConvoList ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Messages</h2>
          <p className="text-xs text-gray-500 mt-1">Chat with accepted connections.</p>
        </div>

        {error ? (
          <div className="m-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </div>
        ) : null}

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-5 text-sm text-gray-500">Loading conversations...</div>
          ) : conversationItems.length === 0 ? (
            <div className="p-5 text-sm text-gray-500">No accepted connections are available to message yet.</div>
          ) : (
            conversationItems.map((item) => (
              <button
                key={item.id}
                onClick={() => selectItem(item)}
                className={`w-full flex items-start gap-3 p-4 text-left hover:bg-gray-50 transition-colors border-b border-gray-50 ${
                  activeRoom?.roomId === item.roomId ? 'bg-accent/5' : ''
                }`}
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold bg-accent/10 text-accent flex-shrink-0">
                  {item.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                    <span className="text-[11px] text-gray-400 flex-shrink-0">{formatTime(item.lastMessageAt)}</span>
                  </div>
                  <p className="text-xs text-gray-500 truncate mt-0.5">{item.lastMessage}</p>
                </div>
                {item.unreadCount > 0 && (
                  <span className="bg-accent text-white text-xs font-bold min-w-5 h-5 px-1 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    {item.unreadCount > 9 ? '9+' : item.unreadCount}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      <div className={`flex-1 flex-col ${showConvoList ? 'hidden md:flex' : 'flex'}`}>
        <div className="h-16 flex items-center justify-between px-4 lg:px-6 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button className="md:hidden text-gray-400 hover:text-gray-600 mr-1" onClick={() => setShowConvoList(true)}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold bg-accent/10 text-accent flex-shrink-0">
              {activeTitle.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{activeTitle}</p>
              <p className="text-xs text-gray-400">{activeRoom ? 'Papersignal secure chat' : 'Choose a contact to start'}</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 lg:px-6 py-4 space-y-4 bg-gray-50/50">
          {roomLoading ? (
            <div className="text-sm text-gray-500">Loading messages...</div>
          ) : !activeRoom ? (
            <div className="h-full flex items-center justify-center text-sm text-gray-500 text-center">
              Select an accepted connection to start messaging.
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-gray-500 text-center">
              No messages yet. Send the first one.
            </div>
          ) : (
            messages.map((message) => (
              <div key={messageKey(message)} className={`flex ${message.isMine ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-[75%]">
                  {!message.isMine && (
                    <p className="text-[11px] text-gray-400 mb-1">{message.senderName}</p>
                  )}
                  <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    message.isMine
                      ? 'bg-accent text-white rounded-br-md'
                      : 'bg-white text-gray-800 border border-gray-100 rounded-bl-md shadow-sm'
                  }`}>
                    {message.isDeleted ? 'This message was deleted.' : message.content}
                  </div>
                  <p className={`text-[10px] text-gray-400 mt-1 ${message.isMine ? 'text-right' : ''}`}>
                    {formatTime(message.createdAt)}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSend} className="p-4 border-t border-gray-100 bg-white flex-shrink-0">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(event) => setNewMessage(event.target.value)}
              placeholder={activeRoom ? 'Type a message...' : 'Select a conversation first'}
              disabled={!activeRoom || sending}
              className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-full text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-accent disabled:cursor-not-allowed disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || !activeRoom || sending}
              className="p-2.5 bg-accent text-white rounded-full hover:bg-accent-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MessagesPage;
