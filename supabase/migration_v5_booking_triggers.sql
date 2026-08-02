-- =================================================================================
-- PHASE 5: BOOKING ENGINE DB TRIGGERS & FUNCTIONS
-- =================================================================================

-- 1. Auto-log Booking State Changes
-- Whenever a booking's status changes, automatically append a record to booking_state_events.
CREATE OR REPLACE FUNCTION public.log_booking_state_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF (TG_OP = 'INSERT') OR (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
        INSERT INTO public.booking_state_events (
            booking_id,
            actor_id,
            previous_status,
            new_status,
            notes
        ) VALUES (
            NEW.id,
            auth.uid(), -- The user making the change
            CASE WHEN TG_OP = 'UPDATE' THEN OLD.status ELSE NULL END,
            NEW.status,
            'Status automatically logged by trigger'
        );
    END IF;
    
    -- Always update updated_at
    IF TG_OP = 'UPDATE' THEN
        NEW.updated_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_booking_state_change ON public.bookings;
CREATE TRIGGER trg_log_booking_state_change
BEFORE INSERT OR UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.log_booking_state_change();


-- 2. Update Profile Ratings
-- Whenever a review is inserted or updated, recalculate the target profile's aggregate rating and review count.
CREATE OR REPLACE FUNCTION public.update_profile_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    avg_rating NUMERIC;
    total_reviews INT;
BEGIN
    -- Only consider public reviews or those where both sides left a review. For now, we just aggregate all reviews for the reviewee.
    SELECT ROUND(AVG(rating)::numeric, 1), COUNT(id)
    INTO avg_rating, total_reviews
    FROM public.reviews
    WHERE reviewee_id = NEW.reviewee_id;
    
    UPDATE public.profiles
    SET rating = COALESCE(avg_rating, 0.0),
        review_count = total_reviews
    WHERE id = NEW.reviewee_id;
    
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_profile_rating ON public.reviews;
CREATE TRIGGER trg_update_profile_rating
AFTER INSERT OR UPDATE OR DELETE ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_profile_rating();


-- 3. Calculate Photographer Completion Rate
-- Triggered whenever a booking is marked completed or cancelled/declined.
CREATE OR REPLACE FUNCTION public.update_photographer_completion_rate()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    total_bookings INT;
    completed_bookings INT;
    c_rate NUMERIC;
BEGIN
    IF (TG_OP = 'UPDATE' AND NEW.status IN ('completed', 'cancelled', 'declined')) THEN
        -- Count total bookings that reached a final state
        SELECT COUNT(id) INTO total_bookings
        FROM public.bookings
        WHERE photographer_id = NEW.photographer_id
          AND status IN ('completed', 'cancelled', 'declined', 'refunded', 'resolved');
          
        SELECT COUNT(id) INTO completed_bookings
        FROM public.bookings
        WHERE photographer_id = NEW.photographer_id
          AND status = 'completed';
          
        IF total_bookings > 0 THEN
            c_rate := ROUND((completed_bookings::numeric / total_bookings::numeric) * 100, 0);
            
            UPDATE public.profiles
            SET completion_rate = c_rate
            WHERE id = NEW.photographer_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_completion_rate ON public.bookings;
CREATE TRIGGER trg_update_completion_rate
AFTER UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.update_photographer_completion_rate();
