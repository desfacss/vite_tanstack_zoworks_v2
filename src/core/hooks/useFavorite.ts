import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/core/lib/store';
import { message } from 'antd';

export const useFavorite = (entityType: string, recordId: string) => {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const { data: subscription, isLoading } = useQuery({
    queryKey: ['subscription', entityType, recordId, user?.id],
    queryFn: async () => {
      if (!user?.id || !recordId) return null;
      const { data } = await supabase
        .schema('core')
        .from('object_subscriptions')
        .select('*')
        .eq('object_id', recordId)
        .eq('user_id', user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id && !!recordId,
  });

  const toggleSubscription = useMutation({
    mutationFn: async () => {
      if (!user?.id || !recordId) return;
      if (subscription) {
        const { error } = await supabase
          .schema('core')
          .from('object_subscriptions')
          .delete()
          .eq('id', subscription.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .schema('core')
          .from('object_subscriptions')
          .insert({
            object_id: recordId,
            user_id: user.id,
            subscription_type: 'watch'
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription', entityType, recordId, user?.id] });
      message.success(subscription ? 'Removed from favorites' : 'Added to favorites');
    },
    onError: (error: any) => message.error('Failed to update favorite: ' + (error.message || 'Unknown error')),
  });

  return {
    subscription,
    isLoading,
    isFavorited: !!subscription,
    toggleFavorite: () => toggleSubscription.mutate(),
    isToggling: toggleSubscription.isPending,
  };
};
