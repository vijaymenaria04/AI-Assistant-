import { db } from './db';
import { voice } from './voice';
import { androidAutomation } from './androidAutomation';
import { BusinessId } from '../types/database';
import { agentValidationError, isProgrammingRequest, requiresAgentConfirmation } from './agentSafety';
import { parseLocalCommand } from './ruleParser';

export interface ParsedAgentResult {
  action: string;
  business_id?: BusinessId;
  business_name?: string;
  requires_owner_confirmation: boolean;
  speech_response: string;
  parameters: {
    amount?: number;
    date?: string;
    item_name?: string;
    quantity?: number;
    unit?: string;
    category?: string;
    payment_method?: string;
    supplier_name?: string;
    contact_name?: string;
    phone_number?: string;
    app_name?: string;
    query?: string;
    location?: string;
    reminder_title?: string;
    reminder_time?: string;
    target?: string;
    period?: string;
    transaction_type?: string;
    notes?: string;
  };
}

class AIAgentService {
  public async processCommand(
    prompt: string,
    currentBusinessId: BusinessId = 'jain-sweets'
  ): Promise<{ result: ParsedAgentResult; executed: boolean }> {
    if (isProgrammingRequest(prompt)) return { result: { action: 'UNKNOWN_QUERY', requires_owner_confirmation: false, speech_response: 'Programming assistance is not available in GopalAI.', parameters: {} }, executed: false };
    const prepare = (result: ParsedAgentResult): ParsedAgentResult => {
      if (!result || typeof result.action !== 'string') return { action: 'UNKNOWN_QUERY', requires_owner_confirmation: false, speech_response: 'I could not understand that request. Please provide more details.', parameters: {} };
      result.parameters = result.parameters || {};
      const error = agentValidationError(result);
      if (error) return { action: 'UNKNOWN_QUERY', requires_owner_confirmation: false, speech_response: error, parameters: {} };
      result.requires_owner_confirmation = requiresAgentConfirmation(result.action);
      if (result.requires_owner_confirmation) result.speech_response = 'Please review and confirm this action. No changes have been made yet.';
      if (result.action === 'UNKNOWN_QUERY') result.speech_response = 'I could not complete that request. Please provide more details or use the relevant app screen.';
      return result;
    };
    try {
      const response = await fetch('/api/ai-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          context: { currentBusinessId }
        })
      });

      const data = await response.json().catch(() => ({}));
      const result: ParsedAgentResult = data.result || parseLocalCommand(prompt, currentBusinessId);

      // Fallback business matching if missing
      if (!result.business_id && result.business_name) {
        const lower = result.business_name.toLowerCase();
        if (lower.includes('jain')) result.business_id = 'jain-sweets';
        else if (lower.includes('paan')) result.business_id = 'paan-bai';
        else if (lower.includes('kesar')) result.business_id = 'kesarwadi';
        else if (lower.includes('personal')) result.business_id = 'personal';
      }
      if (!result.business_id) {
        result.business_id = currentBusinessId;
      }

      return { result: prepare(result), executed: false };
    } catch (err) {
      console.warn('AI Processing Warning (using local parser):', err);
      const fallback = parseLocalCommand(prompt, currentBusinessId);
      return { result: prepare(fallback), executed: false };
    }
  }

  // Quick bars must use the same confirmation path as the main assistant.
  public async runQuickCommand(prompt: string, workspace: BusinessId, onRequestConfirmation?: (result: ParsedAgentResult) => void): Promise<string> {
    const { result } = await this.processCommand(prompt, workspace);
    if (result.requires_owner_confirmation) {
      if (!onRequestConfirmation) return 'No action was taken. Open AI Assistant to review and confirm.';
      onRequestConfirmation(result);
      return 'Review the confirmation. No changes have been made yet.';
    }
    return this.executeAction(result);
  }

  // Execute confirmed action in Database / Android System
  public async executeAction(result: ParsedAgentResult, approved = false): Promise<string> {
    const validationError = agentValidationError(result);
    if (validationError) throw new Error(validationError);
    if (requiresAgentConfirmation(result.action) && !approved) throw new Error('Owner confirmation is required before this action.');
    if (result.action === 'UNKNOWN_QUERY') return result.speech_response;
    const params = result.parameters || {};
    const busId = result.business_id || 'jain-sweets';
    let successMessage = '';

    switch (result.action) {
      case 'ADD_SALE': {
        const saved = await db.addSale({ businessId: busId, amount: params.amount!, date: params.date!, paymentMethod: params.payment_method as 'cash' | 'upi' | 'online' | 'credit', items: [], notes: params.notes });
        if (!(await db.getSales(busId)).some(s => s.id === saved.id)) throw new Error('Could not verify the saved sale. Please check Sales Management before retrying.');
        androidAutomation.playSoundEffect('success');
        successMessage = `Sale of ₹${params.amount} saved for ${busId}.`;
        break;
      }
      case 'ADD_EXPENSE': {
        const saved = await db.addExpense({ businessId: busId, amount: params.amount!, category: params.category as any, date: params.date!, paymentMethod: params.payment_method as 'cash' | 'upi' | 'bank' | 'credit', notes: params.notes });
        if (!(await db.getExpenses(busId)).some(e => e.id === saved.id)) throw new Error('Could not verify the saved expense. Please check Expenses Management before retrying.');
        androidAutomation.playSoundEffect('success');
        successMessage = `Expense of ₹${params.amount} saved for ${busId}.`;
        break;
      }

      case 'ADD_PURCHASE': {
        const amount = params.amount || 0;
        const itemName = params.item_name || 'Goods';
        const qty = params.quantity || 1;
        const unit = params.unit || 'kg';
        const supName = params.supplier_name || 'Supplier';

        await db.addPurchase({
          businessId: busId,
          itemName,
          quantity: qty,
          unit,
          amount,
          supplierName: supName,
          date: new Date().toISOString().split('T')[0],
          paidAmount: amount // Assume paid unless specified
        });

        androidAutomation.playSoundEffect('success');
        successMessage = `Purchase of ${qty} ${unit} ${itemName} for ₹${amount} recorded.`;
        break;
      }

      case 'PAY_SUPPLIER': {
        const amount = params.amount || 0;
        const supName = params.supplier_name || 'Supplier';

        const suppliers = await db.getSuppliers(busId);
        let sup = suppliers.find((s) => s.name.toLowerCase().includes(supName.toLowerCase()));
        if (!sup) {
          sup = await db.addSupplier({ businessId: busId, name: supName, contact: '' });
        }

        await db.paySupplier(sup.id, amount, 'upi', `Payment to ${supName}`);
        androidAutomation.playSoundEffect('success');
        successMessage = `Paid ₹${amount} to ${supName} successfully.`;
        break;
      }

      case 'ADD_REMINDER': {
        const saved = await db.addReminder({ title: params.reminder_title!, dateTime: params.reminder_time!, priority: 'medium', businessId: busId });
        if (!(await db.getReminders()).some(r => r.id === saved.id)) throw new Error('Could not verify the reminder. Please check Reminders before retrying.');
        successMessage = `Reminder saved: ${saved.title}. Background delivery depends on device support.`;
        break;
      }

      case 'CALL_CONTACT': {
        const contact = params.phone_number!;
        androidAutomation.initiatePhoneCall(contact);
        successMessage = `Dialer requested for ${contact}. Please check your device.`;
        break;
      }

      case 'OPEN_APP': {
        const appName = params.app_name || 'App';
        androidAutomation.openApp(appName);
        successMessage = `Opening ${appName} was requested. Please check your device.`;
        break;
      }

      case 'SEARCH_WEB': {
        const query = params.query || '';
        androidAutomation.searchWeb(query);
        successMessage = `Web search requested for "${query}". Please check your device.`;
        break;
      }

      case 'OPEN_MAPS': {
        const loc = params.location || '';
        androidAutomation.openMaps(loc);
        successMessage = `Map requested for ${loc}. Please check your device.`;
        break;
      }

      case 'ADD_PERSONAL_TRANSACTION': {
        const saved = await db.addPersonalTransaction({ type: params.transaction_type as 'income' | 'expense', amount: params.amount!, category: params.category!, date: params.date!, paymentMethod: params.payment_method as 'cash' | 'upi' | 'bank' | 'card', notes: params.notes });
        if (!(await db.getPersonalTransactions()).some(t => t.id === saved.id)) throw new Error('Could not verify the personal transaction. Please check Personal before retrying.');
        successMessage = `Personal ${saved.type} of ₹${saved.amount} saved.`;
        break;
      }

      case 'QUERY_STAFF_COUNT': {
        const staff = await db.getStaff(busId);
        const count = staff.length;
        const busName = busId === 'jain-sweets' ? 'Jain Sweets' : busId === 'paan-bai' ? 'Paan Bai Canteen' : busId === 'kesarwadi' ? 'Kesarwadi Canteen' : 'Gopal Caterers';
        successMessage = `${busName} mein abhi total ${count} staff members assigned hain.`;
        break;
      }

      case 'QUERY_STAFF_SHORTAGE': {
        const staff = await db.getStaff(busId);
        const mp = await db.getManpowerPlans(busId);
        const required = mp.reduce((sum, item) => sum + item.requiredCount, 0);
        const assigned = staff.length;
        const shortage = Math.max(0, required - assigned);
        const busName = busId === 'jain-sweets' ? 'Jain Sweets' : busId === 'paan-bai' ? 'Paan Bai Canteen' : busId === 'kesarwadi' ? 'Kesarwadi Canteen' : 'Gopal Caterers';

        if (mp.length === 0) {
          successMessage = `No manpower plan is recorded for ${busName}; shortage cannot be determined.`;
        } else if (shortage > 0) {
          successMessage = `${busName} mein ${required} required staff ke mukable ${assigned} assigned hain. Total ${shortage} bande kam hain.`;
        } else {
          successMessage = `${busName} mein required staff poora hai (${assigned}/${required}). Koi shortage nahi hai.`;
        }
        break;
      }

      case 'QUERY_PENDING_SALARY': {
        const staff = await db.getStaff();
        const pendingWithAdv = staff.filter((s) => (s.advanceBalance || 0) > 0);
        if (pendingWithAdv.length > 0) {
          const names = pendingWithAdv.map((s) => `${s.name} (Advance ₹${s.advanceBalance})`).join(', ');
          successMessage = `In employees ka advance balance baaki hai: ${names}.`;
        } else {
          successMessage = `Sabhi employees ka salary and advance cleared hai.`;
        }
        break;
      }

      case 'QUERY_CATERING_AVAILABILITY': {
        const orders = await db.getCateringOrders();
        const staff = await db.getStaff();
        const upcomingOrder = orders.find((o) => o.status === 'confirmed' || o.status === 'enquiry');
        const totalWaiters = staff.filter((s) => s.role.toLowerCase().includes('waiter') || s.role.toLowerCase().includes('service')).length || staff.length;

        if (upcomingOrder) {
          const available = Math.max(0, totalWaiters - upcomingOrder.assignedStaffIds.length);
          successMessage = `${upcomingOrder.eventDate} ke ${upcomingOrder.customerName} order ke liye ${available} staff members available hain.`;
        } else {
          successMessage = `Total ${totalWaiters} staff members catering availability ke liye tayyar hain.`;
        }
        break;
      }

      case 'ASSIGN_CATERING_STAFF': {
        const orders = await db.getCateringOrders();
        const staff = await db.getStaff();
        const activeOrder = orders.find((o) => o.status === 'confirmed' || o.status === 'enquiry');

        if (activeOrder) {
          const unassignedIds = staff.map((s) => s.id).slice(0, activeOrder.requiredWaiters + activeOrder.requiredCooks);
          await db.assignStaffToCateringOrder(activeOrder.id, unassignedIds);
          successMessage = `${activeOrder.customerName} ke event ke liye ${unassignedIds.length} staff members successfully assign kar diye gaye hain.`;
        } else {
          successMessage = `Assign karne ke liye koi active catering booking nahi mili.`;
        }
        break;
      }

      default:
        successMessage = result.speech_response || 'Task completed.';
        break;
    }

    // Save into AI history log
    await db.addAIHistory({
      rawCommand: result.speech_response,
      action: result.action,
      status: 'executed',
      speechResponse: successMessage
    });

    // Speak completion response if TTS enabled
    const settings = await db.getSettings();
    if (settings.ttsEnabled) {
      voice.speak(successMessage);
    }

    return successMessage;
  }

}

export const aiAgent = new AIAgentService();
