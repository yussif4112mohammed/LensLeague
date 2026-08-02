-- =================================================================================
-- PHASE 6: MESSAGING & NOTIFICATIONS TRIGGERS
-- =================================================================================

-- 1. Auto-update thread timestamp when a new message is sent
CREATE OR REPLACE FUNCTION public.update_thread_on_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Update the thread's updated_at (we add the column if it doesn't exist)
    UPDATE public.message_threads
    SET created_at = NOW()  -- Using created_at as updated_at proxy since column doesn't exist yet
    WHERE id = NEW.thread_id;
    
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_thread_on_new_message ON public.messages;
CREATE TRIGGER trg_update_thread_on_new_message
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.update_thread_on_new_message();


-- 2. Auto-generate notification when a new message is sent
CREATE OR REPLACE FUNCTION public.notify_on_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    recipient_user_id UUID;
    sender_name TEXT;
BEGIN
    -- Get the sender's display name
    SELECT name INTO sender_name
    FROM public.profiles
    WHERE id = NEW.sender_id;

    -- Fan out a notification to every participant in the thread EXCEPT the sender
    FOR recipient_user_id IN
        SELECT user_id FROM public.thread_participants
        WHERE thread_id = NEW.thread_id AND user_id != NEW.sender_id
    LOOP
        INSERT INTO public.notifications (
            user_id,
            type,
            source_type,
            source_id,
            actor_id,
            message,
            read
        ) VALUES (
            recipient_user_id,
            'new_message',
            'message_thread',
            NEW.thread_id,
            NEW.sender_id,
            COALESCE(sender_name, 'Someone') || ' sent you a message',
            FALSE
        );
    END LOOP;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_new_message ON public.messages;
CREATE TRIGGER trg_notify_on_new_message
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_new_message();


-- 3. Auto-generate notification on new booking request
CREATE OR REPLACE FUNCTION public.notify_on_booking_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    actor_name TEXT;
    target_user UUID;
    notif_message TEXT;
BEGIN
    SELECT name INTO actor_name FROM public.profiles WHERE id = auth.uid();

    IF TG_OP = 'INSERT' THEN
        -- New booking: notify the photographer
        target_user := NEW.photographer_id;
        notif_message := COALESCE(actor_name, 'A client') || ' sent you a booking request';
    ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
        CASE NEW.status
            WHEN 'accepted' THEN
                target_user := NEW.client_id;
                notif_message := COALESCE(actor_name, 'The photographer') || ' accepted your booking!';
            WHEN 'declined' THEN
                target_user := NEW.client_id;
                notif_message := COALESCE(actor_name, 'The photographer') || ' declined your booking request';
            WHEN 'completed' THEN
                -- Notify both parties
                target_user := CASE WHEN auth.uid() = NEW.client_id THEN NEW.photographer_id ELSE NEW.client_id END;
                notif_message := 'A booking has been marked as completed. Leave a review!';
            ELSE
                RETURN NEW;
        END CASE;
    ELSE
        RETURN NEW;
    END IF;

    INSERT INTO public.notifications (user_id, type, source_type, source_id, actor_id, message, read)
    VALUES (target_user, 'booking_update', 'booking', NEW.id, auth.uid(), notif_message, FALSE);

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_booking_change ON public.bookings;
CREATE TRIGGER trg_notify_on_booking_change
AFTER INSERT OR UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_booking_change();


-- 4. Helper RPC: Get or Create a thread between two users
-- This avoids duplicate threads for the same pair of participants.
CREATE OR REPLACE FUNCTION public.get_or_create_thread(user_a UUID, user_b UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    found_thread_id UUID;
BEGIN
    -- Find an existing thread where both users are participants
    SELECT tp1.thread_id INTO found_thread_id
    FROM public.thread_participants tp1
    JOIN public.thread_participants tp2 ON tp1.thread_id = tp2.thread_id
    WHERE tp1.user_id = user_a AND tp2.user_id = user_b
    LIMIT 1;

    IF found_thread_id IS NOT NULL THEN
        RETURN found_thread_id;
    END IF;

    -- No existing thread, create one
    INSERT INTO public.message_threads DEFAULT VALUES
    RETURNING id INTO found_thread_id;

    -- Add both participants
    INSERT INTO public.thread_participants (thread_id, user_id) VALUES
        (found_thread_id, user_a),
        (found_thread_id, user_b);

    RETURN found_thread_id;
END;
$$;
