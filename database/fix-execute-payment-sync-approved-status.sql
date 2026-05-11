-- Kifizetéskor a sor logikailag elfogadott: a dolgozói felület a status mezőt is
-- szinkronban tartja a payment_id-val (régi sorok javítása + függvények frissítése).

-- 1) Már kifizetett, de még "pending" státuszú tételek javítása
UPDATE public.timesheets
SET status = 'approved'
WHERE payment_id IS NOT NULL
  AND status IS DISTINCT FROM 'approved'
  AND status IS DISTINCT FROM 'rejected';

-- 2) execute_payment: kifizetéskor jóváhagyás
CREATE OR REPLACE FUNCTION execute_payment(p_user_id uuid, p_amount numeric)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_payment_id bigint;
  v_admin_id uuid;
BEGIN
  v_admin_id := auth.uid();
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_admin_id AND is_admin = true) THEN
    RAISE EXCEPTION 'Csak admin fizethet ki!';
  END IF;

  INSERT INTO public.payments (user_id, total_paid, admin_id)
  VALUES (p_user_id, p_amount, v_admin_id)
  RETURNING id INTO v_payment_id;

  UPDATE public.timesheets
  SET payment_id = v_payment_id,
      status = 'approved'
  WHERE user_id = p_user_id
    AND payment_id IS NULL
    AND status != 'rejected';

  RETURN json_build_object('success', true, 'payment_id', v_payment_id);
END;
$$;

-- 3) execute_payment_until: hónap/határidő szerinti kifizetés + jóváhagyás
CREATE OR REPLACE FUNCTION execute_payment_until(
  p_user_id uuid,
  p_amount numeric,
  p_cutoff_date date
)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_payment_id bigint;
  v_admin_id uuid;
BEGIN
  v_admin_id := auth.uid();
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_admin_id AND is_admin = true) THEN
    RAISE EXCEPTION 'Csak admin fizethet ki!';
  END IF;

  INSERT INTO public.payments (user_id, total_paid, admin_id)
  VALUES (p_user_id, p_amount, v_admin_id)
  RETURNING id INTO v_payment_id;

  UPDATE public.timesheets
  SET payment_id = v_payment_id,
      status = 'approved'
  WHERE user_id = p_user_id
    AND payment_id IS NULL
    AND status != 'rejected'
    AND work_date <= p_cutoff_date;

  RETURN json_build_object('success', true, 'payment_id', v_payment_id);
END;
$$;
