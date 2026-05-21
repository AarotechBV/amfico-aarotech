import {
  computed,
  DestroyRef,
  inject,
  Injectable,
  signal,
} from '@angular/core';
import { Session } from '@supabase/supabase-js';
import { from, map, Observable } from 'rxjs';
import { SUPABASE_CLIENT } from '../supabase-client.token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly #supabase = inject(SUPABASE_CLIENT);
  readonly #destroyRef = inject(DestroyRef);

  readonly #session = signal<Session | null>(null);
  readonly #initialised = signal(false);

  readonly session = this.#session.asReadonly();
  readonly initialised = this.#initialised.asReadonly();
  readonly accessToken = computed(() => this.#session()?.access_token ?? null);
  readonly user = computed(() => this.#session()?.user ?? null);

  constructor() {
    void this.#supabase.auth.getSession().then(({ data }) => {
      this.#session.set(data.session);
      this.#initialised.set(true);
    });

    const { data: sub } = this.#supabase.auth.onAuthStateChange(
      (_event, session) => {
        this.#session.set(session);
      },
    );
    this.#destroyRef.onDestroy(() => sub.subscription.unsubscribe());
  }

  signInWithPassword(email: string, password: string): Observable<Session> {
    return from(
      this.#supabase.auth.signInWithPassword({ email, password }),
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        if (!data.session) throw new Error('No session returned');
        return data.session;
      }),
    );
  }

  signOut(): Observable<void> {
    return from(this.#supabase.auth.signOut()).pipe(map(() => undefined));
  }
}
